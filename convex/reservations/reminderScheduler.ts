import type { FunctionReference } from "convex/server";
import { cronJobs } from "convex/server";

// Schedule reminder emails to be sent daily at 9 AM
const crons = cronJobs();

// Use string-based reference with proper typing to avoid type instantiation issues
const checkAndSendRemindersRef =
  "reservations/checkAndSendReminders:checkAndSendReminders" as unknown as FunctionReference<
    "action",
    "internal"
  >;

crons.daily(
  "send reservation reminders",
  { hourUTC: 9, minuteUTC: 0 }, // 9:00 AM UTC
  checkAndSendRemindersRef
);

export default crons;
