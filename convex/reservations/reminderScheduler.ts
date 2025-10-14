import { cronJobs } from "convex/server";

// Schedule reminder emails to be sent daily at 9 AM
const crons = cronJobs();

crons.daily(
  "send reservation reminders",
  { hourUTC: 9, minuteUTC: 0 }, // 9:00 AM UTC
  "reservations/checkAndSendReminders:checkAndSendReminders" as unknown
);

export default crons;
