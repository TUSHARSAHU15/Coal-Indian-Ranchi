const Visitor = require('../models/Visitor');
const GateLog = require('../models/GateLog');

/**
 * Get real-time enterprise KPIs
 * @route GET /api/v1/dashboard/kpi
 */
const getKPIs = async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      visitorsToday,
      currentlyInside,
      pendingApprovals,
      completedToday,
      activeInsideList
    ] = await Promise.all([
      Visitor.countDocuments({ visitDate: { $gte: todayStart, $lte: todayEnd } }),
      Visitor.countDocuments({ visitState: 'INSIDE' }),
      Visitor.countDocuments({ status: 'PENDING' }),
      Visitor.countDocuments({
        visitState: 'EXITED',
        checkedOutAt: { $gte: todayStart, $lte: todayEnd }
      }),
      Visitor.find({ visitState: 'INSIDE' }).select('checkedInAt expectedDuration')
    ]);

    // Calculate overstay count (inside > expected duration)
    const now = Date.now();
    let overstayCount = 0;
    activeInsideList.forEach(v => {
      if (v.checkedInAt) {
        const hoursInside = (now - new Date(v.checkedInAt).getTime()) / (1000 * 60 * 60);
        if (hoursInside > (v.expectedDuration || 2)) {
          overstayCount++;
        }
      }
    });

    // Department-wise distribution
    const departmentDistribution = await Visitor.aggregate([
      { $match: { visitDate: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: '$departmentId', count: { $sum: 1 } } },
      {
        $lookup: {
          from: 'departments',
          localField: '_id',
          foreignField: '_id',
          as: 'dept'
        }
      },
      { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: { $ifNull: ['$dept.name', 'General'] },
          count: 1
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      data: {
        visitorsToday,
        currentlyInside,
        pendingApprovals,
        completedToday,
        overstayCount,
        departmentDistribution
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get hourly traffic trends for charts
 * @route GET /api/v1/dashboard/traffic
 */
const getTrafficTrends = async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const logs = await GateLog.find({ createdAt: { $gte: todayStart } });

    // Initialize 24-hour buckets (or 8 AM to 8 PM work hours)
    const hourlyData = Array.from({ length: 14 }, (_, i) => {
      const hour = i + 7; // 07:00 to 20:00
      return {
        time: `${String(hour).padStart(2, '0')}:00`,
        checkIns: 0,
        checkOuts: 0
      };
    });

    logs.forEach(log => {
      const logHour = new Date(log.createdAt).getHours();
      const bucket = hourlyData.find(b => parseInt(b.time.split(':')[0], 10) === logHour);
      if (bucket) {
        if (log.action === 'CHECK_IN') bucket.checkIns++;
        if (log.action === 'CHECK_OUT') bucket.checkOuts++;
      }
    });

    return res.status(200).json({
      success: true,
      data: hourlyData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Emergency evacuation roll-call list
 * @route GET /api/v1/emergency/rollcall
 */
const getEmergencyRollCall = async (req, res, next) => {
  try {
    const activeVisitors = await Visitor.find({ visitState: 'INSIDE' })
      .populate('departmentId', 'name code location contactNumber')
      .populate('hostEmployeeId', 'employeeId role')
      .sort({ checkedInAt: 1 });

    const groupedByDepartment = {};
    activeVisitors.forEach(v => {
      const deptName = v.departmentId?.name || 'Unassigned';
      if (!groupedByDepartment[deptName]) {
        groupedByDepartment[deptName] = [];
      }
      groupedByDepartment[deptName].push({
        _id: v._id,
        visitorId: v.visitorId,
        fullName: v.fullName,
        mobile: v.mobile,
        host: v.hostEmployeeId?.employeeId,
        gateIn: v.gateIn,
        checkedInAt: v.checkedInAt,
        location: v.departmentId?.location
      });
    });

    return res.status(200).json({
      success: true,
      totalInside: activeVisitors.length,
      data: activeVisitors,
      grouped: groupedByDepartment,
      generatedAt: new Date()
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getKPIs,
  getTrafficTrends,
  getEmergencyRollCall
};
