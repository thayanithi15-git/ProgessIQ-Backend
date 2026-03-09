"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI;
        // console.log("Connecting to MongoDB = "+uri);
        if (!uri) {
            throw new Error("MONGO_URI environment variable is required");
        }
        const conn = await mongoose_1.default.connect(uri, {
            serverSelectionTimeoutMS: 5000,
        });
        if (process.env.NODE_ENV === "development") {
            console.log(`MongoDB connected: ${conn.connection.host}`);
        }
        else {
            console.log("MongoDB connected successfully");
        }
    }
    catch (err) {
        console.error("MongoDB connection error:", err.message);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
// Connection Events
mongoose_1.default.connection.on("error", (err) => {
    console.error("❌ MongoDB runtime error:", err.message);
});
mongoose_1.default.connection.on("disconnected", () => {
    console.warn("⚠ MongoDB disconnected");
});
mongoose_1.default.connection.on("connected", () => {
    console.log("🟢 MongoDB connection active");
});
