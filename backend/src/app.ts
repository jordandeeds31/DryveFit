import express from "express";
import cors from "cors";
import errorHandler from "./middleware/errorHandler";
import authRoutes from "./modules/auth/auth.routes";
import programsRoutes from "./modules/programs/programs.routes";
import exerciseRoutes from "./modules/exercises/exercises.routes";
import workoutLogsRoutes from "./modules/workoutLogs/workoutLogs.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/programs", programsRoutes);
app.use("/api/exercises", exerciseRoutes);
app.use("/api/workout-logs", workoutLogsRoutes);

app.use(errorHandler);

export default app;
