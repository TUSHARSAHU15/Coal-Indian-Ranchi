const path = require('path');
require('C:/Users/acer/node-fullstack/backend/node_modules/dotenv').config({ path: 'C:/Users/acer/node-fullstack/backend/.env' });
const mongoose = require('C:/Users/acer/node-fullstack/backend/node_modules/mongoose');
const Department = require('C:/Users/acer/node-fullstack/backend/src/models/Department');
const User = require('C:/Users/acer/node-fullstack/backend/src/models/User');
const Visitor = require('C:/Users/acer/node-fullstack/backend/src/models/Visitor');
const GateLog = require('C:/Users/acer/node-fullstack/backend/src/models/GateLog');
const { encryptPII, hashGovtId } = require('C:/Users/acer/node-fullstack/backend/src/utils/cryptoUtils');

async function run() {
  await mongoose.connect('mongodb://localhost:27017/ccl-dvms');
  console.log('Connected to MongoDB');

  const hqDept = await Department.findOne({ code: 'HQ-RANCHI' });
  const mineDept = await Department.findOne({ code: 'MN-NKP' });
  const workshopDept = await Department.findOne({ code: 'WK-BARK' });

  const hostEmp = await User.findOne({ employeeId: 'EMP-HOST01' });
  const mineEmp = await User.findOne({ employeeId: 'EMP-MINE01' });
  const secEmp = await User.findOne({ employeeId: 'EMP-SEC01' });

  const today = new Date();
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  await Visitor.deleteMany({
    visitorId: {
      $in: [
        'CCL-V-2026-00021', 'CCL-V-2026-00022', 'CCL-V-2026-00023', 'CCL-V-2026-00024',
        'CCL-V-2026-00025', 'CCL-V-2026-00026', 'CCL-V-2026-00027', 'CCL-V-2026-00028',
        'CCL-V-2026-00029'
      ]
    }
  });

  const visitors = [
    // 4 PENDING (for Approval Inbox)
    {
      visitorId: 'CCL-V-2026-00021',
      fullName: 'Rameshwar Prasad',
      mobile: '9835100201',
      email: 'rameshwar.p@bhelmining.co.in',
      govtIdType: 'Aadhaar Card',
      govtIdNumber: encryptPII('9876-1234-5501'),
      govtIdHash: hashGovtId('9876-1234-5501'),
      hostEmployeeId: hostEmp._id,
      departmentId: hqDept._id,
      purpose: 'Review of dragline hydraulic pressure pumps & maintenance schedule',
      visitDate: today,
      expectedDuration: 3,
      passCode: '418290',
      status: 'PENDING',
      visitState: 'NOT_ARRIVED',
      expiresAt: endOfDay
    },
    {
      visitorId: 'CCL-V-2026-00022',
      fullName: 'Dr. Sunita Murmu',
      mobile: '9431105420',
      email: 'sunita.murmu@dgms.gov.in',
      govtIdType: 'Government ID',
      govtIdNumber: encryptPII('DGMS-INSP-2026-99'),
      govtIdHash: hashGovtId('DGMS-INSP-2026-99'),
      hostEmployeeId: mineEmp._id,
      departmentId: mineDept._id,
      purpose: 'Quarterly mine ventilation & statutory safety compliance inspection',
      visitDate: today,
      expectedDuration: 4,
      passCode: '529301',
      status: 'PENDING',
      visitState: 'NOT_ARRIVED',
      expiresAt: endOfDay
    },
    {
      visitorId: 'CCL-V-2026-00023',
      fullName: 'Anand Verma',
      mobile: '9122334455',
      email: 'anand.verma@siemens.com',
      govtIdType: 'PAN Card',
      govtIdNumber: encryptPII('ABCDE1234F'),
      govtIdHash: hashGovtId('ABCDE1234F'),
      hostEmployeeId: hostEmp._id,
      departmentId: workshopDept._id,
      purpose: 'PLC automation switchgear installation in workshop bay 4',
      visitDate: today,
      expectedDuration: 2,
      passCode: '630412',
      status: 'PENDING',
      visitState: 'NOT_ARRIVED',
      expiresAt: endOfDay
    },
    {
      visitorId: 'CCL-V-2026-00024',
      fullName: 'Pooja Kumari',
      mobile: '9876543210',
      email: 'pooja.k@cmpdi.co.in',
      govtIdType: 'Aadhaar Card',
      govtIdNumber: encryptPII('7744-8833-2211'),
      govtIdHash: hashGovtId('7744-8833-2211'),
      hostEmployeeId: mineEmp._id,
      departmentId: mineDept._id,
      purpose: 'Geological coal seam core sample data collection',
      visitDate: today,
      expectedDuration: 5,
      passCode: '741523',
      status: 'PENDING',
      visitState: 'NOT_ARRIVED',
      expiresAt: endOfDay
    },

    // 3 INSIDE (for Emergency Roll Call & Gate Check-Out)
    {
      visitorId: 'CCL-V-2026-00025',
      fullName: 'Vikramaditya Singh',
      mobile: '9471188220',
      email: 'vikram.singh@caterpillar.in',
      govtIdType: 'Aadhaar Card',
      govtIdNumber: encryptPII('6655-4433-2211'),
      govtIdHash: hashGovtId('6655-4433-2211'),
      hostEmployeeId: mineEmp._id,
      departmentId: mineDept._id,
      purpose: 'Emergency repair of 240-tonne dump truck transmission',
      visitDate: today,
      expectedDuration: 4,
      passCode: '482910',
      status: 'APPROVED',
      visitState: 'INSIDE',
      gateIn: 'North Mine Gate 02',
      checkedInAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      approvedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      expiresAt: endOfDay
    },
    {
      visitorId: 'CCL-V-2026-00026',
      fullName: 'Col. R.K. Mehta (Retd)',
      mobile: '9835501199',
      email: 'rkmehta.sec@defense.in',
      govtIdType: 'Armed Forces ID',
      govtIdNumber: encryptPII('IND-ARM-998822'),
      govtIdHash: hashGovtId('IND-ARM-998822'),
      hostEmployeeId: hostEmp._id,
      departmentId: hqDept._id,
      purpose: 'Facility perimeter vulnerability & CISF liaison audit',
      visitDate: today,
      expectedDuration: 6,
      passCode: '620145',
      status: 'APPROVED',
      visitState: 'INSIDE',
      gateIn: 'Main Gate 01',
      checkedInAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      approvedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      expiresAt: endOfDay
    },
    {
      visitorId: 'CCL-V-2026-00027',
      fullName: 'Kavita Soren',
      mobile: '9430123980',
      email: 'kavita.soren@jspcb.gov.in',
      govtIdType: 'Government ID',
      govtIdNumber: encryptPII('JSPCB-ENV-004'),
      govtIdHash: hashGovtId('JSPCB-ENV-004'),
      hostEmployeeId: mineEmp._id,
      departmentId: mineDept._id,
      purpose: 'Environmental ambient air quality & dust suppression audit',
      visitDate: today,
      expectedDuration: 2,
      passCode: '739401',
      status: 'APPROVED',
      visitState: 'INSIDE',
      gateIn: 'Security Gate 03',
      checkedInAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      approvedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      expiresAt: endOfDay
    },

    // 2 APPROVED & NOT_ARRIVED (for Gate Scanner Check-In & Pass Lookup)
    {
      visitorId: 'CCL-V-2026-00028',
      fullName: 'Alok Mukherjee',
      mobile: '9934112233',
      email: 'alok.m@larsentoubro.com',
      govtIdType: 'Aadhaar Card',
      govtIdNumber: encryptPII('1122-3344-5566'),
      govtIdHash: hashGovtId('1122-3344-5566'),
      hostEmployeeId: hostEmp._id,
      departmentId: hqDept._id,
      purpose: 'Excavator electrical telemetry sensors handover',
      visitDate: today,
      expectedDuration: 3,
      passCode: '385920',
      status: 'APPROVED',
      visitState: 'NOT_ARRIVED',
      approvedAt: new Date(),
      expiresAt: endOfDay
    },
    {
      visitorId: 'CCL-V-2026-00029',
      fullName: 'Deepak Kumar',
      mobile: '9835009988',
      email: 'deepak.k@coalindia.in',
      govtIdType: 'PAN Card',
      govtIdNumber: encryptPII('BKPDK9921M'),
      govtIdHash: hashGovtId('BKPDK9921M'),
      hostEmployeeId: mineEmp._id,
      departmentId: mineDept._id,
      purpose: 'High-level production review & dispatch monitoring',
      visitDate: today,
      expectedDuration: 4,
      passCode: '519382',
      status: 'APPROVED',
      visitState: 'NOT_ARRIVED',
      approvedAt: new Date(),
      expiresAt: endOfDay
    }
  ];

  for (const v of visitors) {
    const created = await Visitor.create(v);
    console.log('Seeded visitor: ' + created.visitorId + ' (' + created.fullName + ' | ' + created.status + ' | ' + created.visitState + ' | PassCode: ' + created.passCode + ')');
    if (created.visitState === 'INSIDE') {
      await GateLog.create({
        visitorId: created._id,
        action: 'CHECK_IN',
        qrTokenVerified: true,
        scannedBy: secEmp._id,
        createdAt: created.checkedInAt
      });
    }
  }

  console.log('All 9 operational visitors and gate logs seeded successfully!');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
