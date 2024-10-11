// File: cron-jobs/departmentCron.js

const cron = require("node-cron");
const departmentService = require("../departments/department.service");

let departmentCounts = {}; // Store counts for different campuses
let nextUpdateTime = null;

// Schedule a cron job to fetch department count every 5 minutes
const fetchDepartmentCountJob = () => {
  cron.schedule("*/3 * * * *", async () => {
    try {
      // Dynamically fetch all campus IDs
      const campusIds = await departmentService.getAllCampusIds();

      // Fetch department counts for each campus
      for (const campusId of campusIds) {
        const count = await departmentService.getAllDepartmentCount(campusId);
        departmentCounts[campusId] = count;
      }

      // Calculate the total count across all campuses
      departmentCounts["all"] = campusIds.reduce((total, campusId) => {
        return total + (departmentCounts[campusId] || 0);
      }, 0);

      nextUpdateTime = new Date(Date.now() + 3 * 60 * 1000); // Next update in 5 minutes
      console.log(
        `Department counts updated at ${new Date()}`,
        departmentCounts
      );
    } catch (error) {
      console.error("Error fetching department counts:", error.message);
    }
  });
};

// API to get the current department count for a specific campus or all campuses
const getDepartmentCountData = (req, res) => {
  const campusId = req.query.campus_id;

  // If no campus_id is provided, return the total count across all campuses
  const departmentCount = campusId
    ? departmentCounts[campusId] || 0 // Return count for the specific campus
    : departmentCounts["all"] || 0; // Return total count for all campuses

  res.json({
    departmentCount,
    nextUpdate: nextUpdateTime,
  });
};

module.exports = {
  fetchDepartmentCountJob,
  getDepartmentCountData,
};
