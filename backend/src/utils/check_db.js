const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');

async function checkDb() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ccl-dvms';
    await mongoose.connect(mongoUri);

    const Visitor = require('../models/Visitor');
    const GateLog = require('../models/GateLog');
    const User = require('../models/User');
    const Department = require('../models/Department');

    const [vCount, gCount, uCount, dCount] = await Promise.all([
      Visitor.countDocuments(),
      GateLog.countDocuments(),
      User.countDocuments(),
      Department.countDocuments()
    ]);

    console.log('===================================================');
    console.log('  CCL DVMS Database Inspector (MongoDB: ccl-dvms)');
    console.log('===================================================');
    console.log('\n[TOTAL RECORDS IN DATABASE]');
    console.log(` - Total Visitors Registered : ${vCount}`);
    console.log(` - Total Gate Scan Logs      : ${gCount}`);
    console.log(` - Total System Users        : ${uCount}`);
    console.log(` - Total Departments / Mines : ${dCount}`);

    console.log('\n---------------------------------------------------');
    console.log(' LATEST 5 VISITORS STORED IN MONGODB:');
    console.log('---------------------------------------------------');
    const visitors = await Visitor.find().sort({ createdAt: -1 }).limit(5);

    visitors.forEach((item, index) => {
      console.log(`${index + 1}. ${item.fullName}`);
      console.log(`   - Visitor ID : ${item.visitorId}`);
      console.log(`   - Mobile     : ${item.mobile}`);
      console.log(`   - Pass Code  : ${item.passCode}`);
      console.log(`   - Status     : ${item.status}`);
      console.log(`   - Visit State: ${item.visitState}`);
      console.log(`   - Created At : ${item.createdAt.toLocaleString()}\n`);
    });

    console.log('===================================================');
    console.log(' STATUS: Database is connected & saving data properly!');
    console.log('===================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  }
}

checkDb();
