/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as areas from "../areas.js";
import type * as canonical from "../canonical.js";
import type * as crons from "../crons.js";
import type * as day from "../day.js";
import type * as events from "../events.js";
import type * as goals from "../goals.js";
import type * as habits from "../habits.js";
import type * as model_areas from "../model/areas.js";
import type * as model_day from "../model/day.js";
import type * as model_events from "../model/events.js";
import type * as model_goals from "../model/goals.js";
import type * as model_habits from "../model/habits.js";
import type * as model_profiles from "../model/profiles.js";
import type * as model_projects from "../model/projects.js";
import type * as model_sample from "../model/sample.js";
import type * as model_shared from "../model/shared.js";
import type * as model_tasks from "../model/tasks.js";
import type * as model_week from "../model/week.js";
import type * as profiles from "../profiles.js";
import type * as projects from "../projects.js";
import type * as service from "../service.js";
import type * as serviceAuth from "../serviceAuth.js";
import type * as serviceInternal from "../serviceInternal.js";
import type * as tasks from "../tasks.js";
import type * as validators from "../validators.js";
import type * as week from "../week.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  areas: typeof areas;
  canonical: typeof canonical;
  crons: typeof crons;
  day: typeof day;
  events: typeof events;
  goals: typeof goals;
  habits: typeof habits;
  "model/areas": typeof model_areas;
  "model/day": typeof model_day;
  "model/events": typeof model_events;
  "model/goals": typeof model_goals;
  "model/habits": typeof model_habits;
  "model/profiles": typeof model_profiles;
  "model/projects": typeof model_projects;
  "model/sample": typeof model_sample;
  "model/shared": typeof model_shared;
  "model/tasks": typeof model_tasks;
  "model/week": typeof model_week;
  profiles: typeof profiles;
  projects: typeof projects;
  service: typeof service;
  serviceAuth: typeof serviceAuth;
  serviceInternal: typeof serviceInternal;
  tasks: typeof tasks;
  validators: typeof validators;
  week: typeof week;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
