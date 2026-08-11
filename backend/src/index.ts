import cron from "node-cron";
import app from "./app";
import { env } from "./config/env";
import { sendDueWorkoutReminders } from "./jobs/workoutReminders";

app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
});

// Every 15 minutes so each user's 8:25-8:44pm local window (computed from
// their stored timezone, see workoutReminders.ts) gets checked once a day
// without needing a per-user cron schedule.
cron.schedule("*/15 * * * *", () => {
  sendDueWorkoutReminders().catch((err) => {
    console.error("sendDueWorkoutReminders failed:", err);
  });
});
