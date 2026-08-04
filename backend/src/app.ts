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

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/programs", programsRoutes);
app.use("/api/exercises", exerciseRoutes);
app.use("/api/workout-logs", workoutLogsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/cities", citiesRoutes);

app.use(errorHandler);

export default app;
