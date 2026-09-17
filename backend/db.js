require("dotenv").config();
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("MongoDB connected successfully!");
  } 
     catch (error) {

    console.error("MongoDB connection failed:", error.message);

    if (error.reason && error.reason.servers) {
      for (const [server, details] of error.reason.servers) {
        console.error(`MongoDB server: ${server}`);
        console.error("Server error:", details.error);
      }
    }

    console.error(
      "Topology:",
      error.reason?.type
    );

    console.error(
      "Server will start but database operations will fail until connection is restored."
    );
  }
};
