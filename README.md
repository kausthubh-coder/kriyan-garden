# Kriyan prototype

An interactive Next.js prototype for a self-hosted personal productivity garden. It includes Garden, Distance, and Calendar views over the same task data, a writing surface on every task, advanced scheduling details, reminders, task creation, and completion.

## Run it

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Local data

The prototype uses SQLite through `better-sqlite3`. On first run it creates `.data/kriyan.db` and opens onboarding. The database is local and ignored by git. The optional sample garden is loaded only when the user chooses it.

## Main flows

- Create personal spaces such as School, Coding, or Health during onboarding.
- Add, rename, or remove spaces later from the spaces panel.
- Switch between Garden, Distance, and Calendar without changing the underlying tasks.
- Add a todo from the persistent header action, inside a space, or from a day in Calendar.
- Open any stone to edit its title, place, distance, date, time, duration, repeat rule, reminders, and writing page.
- Use the writing tools for headings, lists, and a child-page link.
- Complete a task with "lift from the bed".

## Structure

- `src/lib/db.ts` owns the SQLite schema, optional sample data, and queries.
- `src/app/actions.ts` validates writes and exposes Next.js server actions.
- `src/components/kriyan/` contains the interactive product UI.
- `design-references/` contains the source screenshots used for the visual direction.
