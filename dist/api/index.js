"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_mongo_sanitize_1 = __importDefault(require("express-mongo-sanitize"));
const mongoose_1 = __importDefault(require("mongoose"));
// Load env FIRST
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// ================= MIDDLEWARE =================
const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://progress-iq.vercel.app",
    process.env.CLIENT_URL
].filter(Boolean);
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
}));
app.use((0, helmet_1.default)());
app.use(express_1.default.json({ limit: "10mb" }));
app.use((0, express_mongo_sanitize_1.default)());
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
});
app.use(limiter);
const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI;
        if (!uri) {
            throw new Error("❌ MONGO_URI environment variable is required");
        }
        // Prevent multiple connections in dev / serverless
        if (mongoose_1.default.connection.readyState >= 1) {
            return;
        }
        const conn = await mongoose_1.default.connect(uri);
        console.log(process.env.NODE_ENV === "development"
            ? `MongoDB connected: ${conn.connection.host}`
            : "MongoDB connected successfully");
    }
    catch (err) {
        console.error("MongoDB connection error:", err.message);
        process.exit(1);
    }
};
// Connection events
mongoose_1.default.connection.on("error", (err) => console.error("❌ MongoDB runtime error:", err.message));
mongoose_1.default.connection.on("disconnected", () => console.warn("⚠ MongoDB disconnected"));
mongoose_1.default.connection.on("connected", () => console.log("🟢 MongoDB connection active"));
// ================= ROUTES =================
app.get("/", (_, res) => res.send("API is running"));
// Import AFTER middleware
const security_1 = require("./middleware/security");
app.use(security_1.securityLogger);
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const mentorRoutes_1 = __importDefault(require("./routes/mentorRoutes"));
const studentRoutes_1 = __importDefault(require("./routes/studentRoutes"));
const notificationsRoutes_1 = __importDefault(require("./routes/notificationsRoutes"));
app.use("/api/auth", authRoutes_1.default);
app.use("/api/admin", adminRoutes_1.default);
app.use("/api/mentor", mentorRoutes_1.default);
app.use("/api/student", studentRoutes_1.default);
app.use("/api/notifications", notificationsRoutes_1.default);
const errorHandler_1 = require("./middleware/errorHandler");
app.use(errorHandler_1.errorHandler);
// ================= START SERVER =================
const cronService_1 = require("./services/cronService");
// Only start listener in LOCAL — not in Vercel
if (process.env.NODE_ENV !== "production") {
    connectDB().then(() => {
        (0, cronService_1.startCronJobs)();
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    });
}
else {
    // For Vercel – connect immediately
    connectDB();
}
exports.default = app;
