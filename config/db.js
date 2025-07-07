const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      writeConcern: { w: "majority", j: true },
      retryWrites: true,
      maxPoolSize: 10,
      minPoolSize: 2,
    });

    mongoose.connection.on("disconnected", () => {
      console.log("MongoDB disconnected, attempting to reconnect...");
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    setTimeout(() => {
      console.error("Could not connect to MongoDB. Exiting application...");
      process.exit(1);
    }, 5000);
  }
};

module.exports = connectDB;
