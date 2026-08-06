import express from "express";
import cors from "cors";
import errorHandler from "./middleware/errorHandler";
import authRoutes from "./modules/auth/auth.routes";
import programsRoutes from "./modules/programs/programs.routes";
import exerciseRoutes from "./modules/exercises/exercises.routes";
import workoutLogsRoutes from "./modules/workoutLogs/workoutLogs.routes";
import usersRoutes from "./modules/users/users.routes";
import leaderboardRoutes from "./modules/leaderboard/leaderboard.routes";
import citiesRoutes from "./modules/cities/cities.routes";
import activityRoutes from "./modules/activity/activity.routes";
import PRIVACY_POLICY_HTML from "./privacyPolicy";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/privacy", (_req, res) => {
  res.type("html").send(PRIVACY_POLICY_HTML);
});

app.use("/api/auth", authRoutes);
app.use("/api/programs", programsRoutes);
app.use("/api/exercises", exerciseRoutes);
app.use("/api/workout-logs", workoutLogsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/cities", citiesRoutes);
app.use("/api/activity", activityRoutes);

app.use(errorHandler);

export default app;
