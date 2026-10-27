const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/ccl-dvms';
  
  if (!process.env.MONGO_URI && process.env.NODE_ENV === 'production') {
    console.error('[CRITICAL] MONGO_URI environment variable is not set in production!');
    console.error('Please configure your MongoDB Atlas connection string in the Render Dashboard environment variables.');
  }

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
