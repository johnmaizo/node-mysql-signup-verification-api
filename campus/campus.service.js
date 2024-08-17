const {Op} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

module.exports = {
  createCampus,
  getAllCampus,
  getAllCampusActive,
  getCampusById,
  updateCampus,
};

async function createCampus(params) {
  // validate
  if (await db.Campus.findOne({where: {campusName: params.campusName}})) {
    throw 'Campus name "' + params.campusName + '" is already registered';
  }

  const campus = new db.Campus(params);

  // save campus
  await campus.save();
}

async function getAllCampus() {
  const campus = await db.Campus.findAll();

  return campus;
}

async function getAllCampusActive() {
  const campuses = await db.Campus.count({
    where: {
      isActive: true,
    },
  });
  return campuses;
}

async function getCampusById(id) {
  const campus = await db.Campus.findByPk(id);
  if (!campus) throw "Campus not found";
  return campus;
}

async function updateCampus(id, params) {
  const campus = await getCampusById(id);

  if (!campus) throw "Campus not found";

  Object.assign(campus, params);
  await campus.save();
}
