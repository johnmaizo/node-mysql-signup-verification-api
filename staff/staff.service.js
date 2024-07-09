const {Op} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

module.exports = {
  getAllStaff,
  createStaff,
  getStaffById,
  updateStaff,
};

async function createStaff(params) {
  const staff = new db.StaffInfo(params);

  // save staff
  await staff.save();
}

async function getAllStaff() {
  const staff = await db.StaffInfo.findAll();

  return staff;
}

async function getStaffById(id) {
  const staff = await db.StaffInfo.findByPk(id);
  if (!staff) throw "Staff not found";
  return staffBasicDetails;
}

async function updateStaff(id, params) {
  const staff = await getStaffById(id);

  if (!staff) throw "Staff not found";

  Object.assign(staff, params);
  await staff.save();
}
