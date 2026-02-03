import mongoose from "mongoose";

export const connectDB = async (): Promise<void> => {
  try {
    const uri = process.env.MONGO_URI;
    // console.log("Connecting to MongoDB = "+uri);
    if (!uri) {
      throw new Error("MONGO_URI environment variable is required");
    }

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    if (process.env.NODE_ENV === "development") {
      console.log(`MongoDB connected: ${conn.connection.host}`);
    } else {
      console.log("MongoDB connected successfully");
    }

  } catch (err: any) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
};

// Connection Events
mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB runtime error:", err.message);
});

mongoose.connection.on("disconnected", () => {
  console.warn("⚠ MongoDB disconnected");
});

mongoose.connection.on("connected", () => {
  console.log("🟢 MongoDB connection active");
});
