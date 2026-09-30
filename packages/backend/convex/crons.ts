import { cronJobs, makeFunctionReference } from "convex/server";
const crons = cronJobs();
crons.hourly("Delete expired service nonces", { minuteUTC: 0 }, makeFunctionReference<"mutation", Record<string, never>, null>("serviceInternal:cleanupNonces"), {});
export default crons;
