const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Department = require('../models/Department');
const User = require('../models/User');

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ccl-dvms';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for seeding...');

    // 1. Seed Departments
    const departmentsData = [
      {
        code: 'HQ-RANCHI',
        name: 'Headquarters & Administration',
        location: 'Darbhanga House, Ranchi',
        type: 'HEADQUARTERS',
        contactNumber: '0651-2360123'
      },
      {
        code: 'MN-NKP',
        name: 'North Karanpura Open Cast Mine',
        location: 'Tandwa, Chatra District',
        type: 'MINE',
        contactNumber: '0654-245100'
      },
      {
        code: 'WK-BARK',
        name: 'Barkakana Central Workshop',
        location: 'Ramgarh Industrial Area',
        type: 'WORKSHOP',
        contactNumber: '0655-278900'
      },
      {
        code: 'RG-KATH',
        name: 'Kathara Regional Division',
        location: 'Bokaro Region',
        type: 'REGIONAL',
        contactNumber: '0654-289110'
      }
    ];

    const savedDepartments = {};
    for (const d of departmentsData) {
      const dept = await Department.findOneAndUpdate(
        { code: d.code },
        { $set: d },
        { upsert: true, returnDocument: 'after' }
      );
      savedDepartments[d.code] = dept._id;
      console.log(`Department seeded: ${dept.code} - ${dept.name}`);
    }

    // 2. Seed Users
    const passwordHash = await bcrypt.hash('Password@123', 10);
    const usersData = [
      {
        employeeId: 'EMP-ADMIN',
        role: 'SUPER_ADMIN',
        departmentId: savedDepartments['HQ-RANCHI'],
        password: passwordHash
      },
      {
        employeeId: 'EMP-SEC01',
        role: 'SECURITY',
        departmentId: savedDepartments['HQ-RANCHI'],
        password: passwordHash
      },
      {
        employeeId: 'EMP-HOST01',
        role: 'EMPLOYEE',
        departmentId: savedDepartments['HQ-RANCHI'],
        password: passwordHash
      },
      {
        employeeId: 'EMP-MINE01',
        role: 'EMPLOYEE',
        departmentId: savedDepartments['MN-NKP'],
        password: passwordHash
      }
    ];

    for (const u of usersData) {
      const user = await User.findOneAndUpdate(
        { employeeId: u.employeeId },
        { $set: u },
        { upsert: true, returnDocument: 'after' }
      );
      console.log(`User seeded: ${user.employeeId} (${user.role}) [Password: Password@123]`);
    }

    console.log('\nSeeding completed successfully!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
