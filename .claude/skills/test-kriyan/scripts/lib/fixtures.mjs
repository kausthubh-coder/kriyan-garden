import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { root, UsageError } from './config.mjs';
import { call, resetOwner } from './service.mjs';

export function localToday(timezone = Intl.DateTimeFormat().resolvedOptions().timeZone, instant = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(instant);
  const part = name => parts.find(value => value.type === name)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function addDays(date, offset) {
  const [year, month, day] = date.split('-').map(Number), value = new Date(Date.UTC(year, month - 1, day + offset));
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
}
export function nextDstDate(today) {
  const offset = date => new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', timeZoneName: 'longOffset' }).format(new Date(`${date}T12:00:00Z`));
  let previous = offset(today).split('GMT')[1];
  for (let days = 1; days <= 370; days++) {
    const date = addDays(today, days), current = offset(date).split('GMT')[1];
    if (current !== previous) return date;
    previous = current;
  }
  throw new UsageError('Could not find the next New York DST change.');
}
export function resolveDates(value, today) {
  if (Array.isArray(value)) return value.map(item => resolveDates(item, today));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveDates(item, today)]));
  if (typeof value === 'string') {
    const match = /^\$(today|dst)([+-]\d+)?$/.exec(value);
    if (match) return addDays(match[1] === 'dst' ? nextDstDate(today) : today, Number(match[2] ?? 0));
  }
  return value;
}
export async function loadFixture(name, today = localToday('America/New_York')) {
  if (!['sample', 'empty-areas', 'overlapping-day', 'late-goal', 'dst-week', 'long-titles'].includes(name)) throw new UsageError('Unknown fixture. Use sample, empty-areas, overlapping-day, late-goal, dst-week or long-titles.');
  return resolveDates(JSON.parse(await readFile(resolve(root, `.agents/skills/test-kriyan/scripts/fixtures/${name}.json`), 'utf8')), today);
}
export async function populateFixture(ownerId, fixture, { reset = true, complete = true } = {}) {
  if (reset) await resetOwner(ownerId);
  // One signed invocation covers this logical fixture operation; every request still has its own replay nonce.
  const invocation = { id: randomUUID(), kind: 'write' };
  const invoke = (operation, args = {}) => call(ownerId, operation, { ...args, invocation });
  await invoke('profiles.ensure', { timezone: fixture.timezone ?? 'America/New_York' });
  if (fixture.profile) await invoke('profiles.update', { patch: fixture.profile });
  const areas = new Map(), projects = new Map(), goals = new Map();
  const defaults = await invoke('areas.list');
  const counts = { areas: 0, projects: 0, events: 0, goals: 0, milestones: 0, tasks: 0, habits: 0 };
  for (const { key, ...args } of fixture.areas ?? []) {
    const existing = defaults.find(area => area.name === args.name);
    const row = existing ? await invoke('areas.update', { id: existing._id, patch: args }) : await invoke('areas.create', args);
    areas.set(key, row._id); counts.areas++;
  }
  for (const area of defaults) if (![...areas.values()].includes(area._id)) await invoke('areas.remove', { id: area._id });
  const reference = (map, key) => {
    if (!map.has(key)) throw new UsageError(`Fixture reference is missing: ${key}.`);
    return map.get(key);
  };
  for (const { key, area, ...args } of fixture.projects ?? []) {
    const row = await invoke('projects.create', { ...args, areaId: reference(areas, area) });
    projects.set(key, row._id); counts.projects++;
  }
  for (const { key, area, ...args } of fixture.goals ?? []) {
    const row = await invoke('goals.create', { ...args, areaId: reference(areas, area) });
    goals.set(key, row._id); counts.goals++;
  }
  for (const { goal, ...args } of fixture.milestones ?? []) {
    await invoke('goals.createMilestone', { ...args, goalId: reference(goals, goal) }); counts.milestones++;
  }
  for (const { area, date, ...args } of fixture.events ?? []) {
    const recurrence = date ? { fromDate: date, untilDate: date, weekdays: [new Date(`${date}T12:00:00Z`).getUTCDay()] } : {};
    await invoke('events.create', { ...args, ...recurrence, areaId: area ? reference(areas, area) : null }); counts.events++;
  }
  for (const { area, project, goal, done, ...args } of fixture.tasks ?? []) {
    const row = await invoke('tasks.create', { ...args, areaId: reference(areas, area), ...(project ? { projectId: reference(projects, project) } : {}), ...(goal ? { goalId: reference(goals, goal) } : {}) });
    if (done) await invoke('tasks.complete', { id: row._id });
    counts.tasks++;
  }
  for (const { area, ...args } of fixture.habits ?? []) {
    await invoke('habits.create', { ...args, areaId: reference(areas, area) }); counts.habits++;
  }
  if (complete) await invoke('profiles.completeOnboarding');
  return counts;
}
export async function seedFixture(ownerId, name, options = {}) {
  return populateFixture(ownerId, await loadFixture(name, options.today), options);
}
