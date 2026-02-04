import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import mongoSanitize from "express-mongo-sanitize";
import mongoose from "mongoose";

// Load env FIRST
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ================= MIDDLEWARE =================

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://progress-iq.vercel.app",
  process.env.CLIENT_URL
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(helmet());
app.use(express.json({ limit: "10mb" }));
app.use(mongoSanitize());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

// ================= DB CONNECTION =================

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;

    if (!uri) {
      throw new Error("❌ MONGO_URI environment variable is required");
    }

    // Prevent multiple connections in dev / serverless
    if (mongoose.connection.readyState >= 1) {
      return;
    }

    const conn = await mongoose.connect(uri);

    console.log(
      process.env.NODE_ENV === "development"
        ? `MongoDB connected: ${conn.connection.host}`
        : "MongoDB connected successfully"
    );

  } catch (err: any) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
};

// Connection events
mongoose.connection.on("error", (err) =>
  console.error("❌ MongoDB runtime error:", err.message)
);

mongoose.connection.on("disconnected", () =>
  console.warn("⚠ MongoDB disconnected")
);

mongoose.connection.on("connected", () =>
  console.log("🟢 MongoDB connection active")
);

// ================= ROUTES =================

app.get("/", (_, res) => res.send("API is running"));

// Import AFTER middleware
import { securityLogger } from "./middleware/security";
app.use(securityLogger);

import authRoutes from "./routes/authRoutes";
import adminRoutes from "./routes/adminRoutes";
import mentorRoutes from "./routes/mentorRoutes";
import studentRoutes from "./routes/studentRoutes";
import notificationsRoutes from "./routes/notificationsRoutes";

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/mentors", mentorRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/notifications", notificationsRoutes);

import { errorHandler } from "./middleware/errorHandler";
app.use(errorHandler);

// ================= START SERVER =================

// Only start listener in LOCAL — not in Vercel
if (process.env.NODE_ENV !== "production") {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  });
} else {
  // For Vercel – connect immediately
  connectDB();
}

export default app;
