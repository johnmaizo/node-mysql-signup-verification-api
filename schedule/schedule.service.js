const {Op} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

module.exports = {
  getAllSchedule,
  createSchedule,
  getScheduleById,
  updateSchedule,
};

async function createSchedule(params) {
  const schedule = new db.Schedule(params);

  // save department
  await schedule.save();
}

async function getAllSchedule() {
  const schedule = await db.Schedule.findAll();

  return schedule;
}

async function getScheduleById(id) {
  const schedule = await db.Schedule.findByPk(id);
  if (!schedule) throw "Schedule not found";
  return schedule;
}

async function updateSchedule(id, params) {
  const schedule = await getScheduleById(id);

  if (!schedule) throw "Schedule not found";

  Object.assign(schedule, params);
  await schedule.save();
}
