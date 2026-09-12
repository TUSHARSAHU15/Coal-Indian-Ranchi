const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/ccl-dvms';
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`MongoDB Connected successfully: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    console.warn(`[Database Notice] Operating in fallback mode. Connect a cloud MongoDB (Atlas) via MONGO_URI environment variable.`);
  }
};

module.exports = connectDB;
