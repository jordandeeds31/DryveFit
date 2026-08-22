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
import cardioRoutes from "./modules/cardio/cardio.routes";
import cardioLeaderboardRoutes from "./modules/cardio-leaderboard/cardioLeaderboard.routes";
import chatRoutes from "./modules/chat/chat.routes";
import waitlistRoutes from "./modules/waitlist/waitlist.routes";
import nutritionRoutes from "./modules/nutrition/nutrition.routes";
import postsRoutes from "./modules/posts/posts.routes";
import notificationsRoutes from "./modules/notifications/notifications.routes";
import messagesRoutes from "./modules/messages/messages.routes";
import newsRoutes from "./modules/news/news.routes";
import blogRoutes from "./modules/blog/blog.routes";
import PRIVACY_POLICY_HTML from "./privacyPolicy";
import SUPPORT_PAGE_HTML from "./supportPage";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/privacy", (_req, res) => {
  res.type("html").send(PRIVACY_POLICY_HTML);
});

app.get("/support", (_req, res) => {
  res.type("html").send(SUPPORT_PAGE_HTML);
});

app.use("/api/auth", authRoutes);
app.use("/api/programs", programsRoutes);
app.use("/api/exercises", exerciseRoutes);
app.use("/api/workout-logs", workoutLogsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/cities", citiesRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/cardio", cardioRoutes);
app.use("/api/cardio-leaderboard", cardioLeaderboardRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/waitlist", waitlistRoutes);
app.use("/api/nutrition", nutritionRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/blog", blogRoutes);

app.use(errorHandler);

export default app;
