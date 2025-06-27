// src/index.ts
import dotenv from "dotenv";

const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";
dotenv.config({ path: envFile });
console.log(`🔧 Loaded environment from ${envFile}`);

import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import commentRoute from "./routes/commentRoutes";
import GptRoute from "./routes/GptRoute"
import AiReview from "./routes/ai-review"
const app: Application = express();

app.use(helmet());

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      service: "PullQuest Backend API",
      version: "v1.0.0",
      message: "👋 Welcome to the PullQuest Backend!",
      docs: [
        { path: "/health",    desc: "Health check" },
        { path: "/api/comment/issues", desc: "POST → comment on PR/issue" },
      ],
    });
  });

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.use('/api/comment', commentRoute);
app.use('/api/chatgpt', GptRoute);
app.use('/api', AiReview )
// 404 handler (must come after all other routes)
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: "Route not found",
    message: "The requested endpoint does not exist",
  });
});

// ─── Error handler ──────────────────────────────────────────────────────
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Server Error:", err);
  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development" ? err.message : "Something went wrong",
  });
});

// ─── MongoDB connection ─────────────────────────────────────────────────
let isConnected = false;
async function connectDB(): Promise<void> {
  if (isConnected) return;

  const mongoURI = process.env.MONGO_URI;
  if (!mongoURI) throw new Error("MONGO_URI not found in environment variables");

  await mongoose.connect(mongoURI);
  isConnected = true;
  console.log("✅ MongoDB connected successfully");
}

// ─── Start server ───────────────────────────────────────────────────────
const port = Number(process.env.PORT || 5000);
connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`🚀 Server listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to connect to DB, shutting down", err);
    process.exit(1);
  });

// ─── Serverless export for platforms like Vercel ───────────────────────
export default app;
