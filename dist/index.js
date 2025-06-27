"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
const dotenv_1 = __importDefault(require("dotenv"));
const envFile = process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";
dotenv_1.default.config({ path: envFile });
console.log(`🔧 Loaded environment from ${envFile}`);
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const mongoose_1 = __importDefault(require("mongoose"));
const commentRoutes_1 = __importDefault(require("./routes/commentRoutes"));
const GptRoute_1 = __importDefault(require("./routes/GptRoute"));
const ai_review_1 = __importDefault(require("./routes/ai-review"));
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: true,
    credentials: true,
}));
app.use(express_1.default.json());
app.get("/", (_req, res) => {
    res.status(200).json({
        success: true,
        service: "PullQuest Backend API",
        version: "v1.0.0",
        message: "👋 Welcome to the PullQuest Backend!",
        docs: [
            { path: "/health", desc: "Health check" },
            { path: "/api/comment/issues", desc: "POST → comment on PR/issue" },
        ],
    });
});
app.get("/health", (_req, res) => {
    res.status(200).json({
        success: true,
        message: "Server is running",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
    });
});
app.use('/api/comment', commentRoutes_1.default);
app.use('/api/chatgpt', GptRoute_1.default);
app.use('/api', ai_review_1.default);
// 404 handler (must come after all other routes)
app.use((_req, res) => {
    res.status(404).json({
        error: "Route not found",
        message: "The requested endpoint does not exist",
    });
});
// ─── Error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error("Server Error:", err);
    res.status(500).json({
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? err.message : "Something went wrong",
    });
});
// ─── MongoDB connection ─────────────────────────────────────────────────
let isConnected = false;
async function connectDB() {
    if (isConnected)
        return;
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI)
        throw new Error("MONGO_URI not found in environment variables");
    await mongoose_1.default.connect(mongoURI);
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
exports.default = app;
//# sourceMappingURL=index.js.map