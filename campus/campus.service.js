const {Op, where} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

module.exports = {
  createCampus,
  getAllCampus,
  getAllCampusActive,
  getAllCampusDeleted,
  getAllCampusCount,
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
  const campus = await db.Campus.findAll({
    where: {
      isDeleted: false,
    },
  });

  return campus;
}

async function getAllCampusActive() {
  const campuses = await db.Campus.findAll({
    where: {
      isActive: true,
      isDeleted: false,
    },
  });
  return campuses;
}


async function getAllCampusDeleted() {
  const campuses = await db.Campus.findAll({
    where: {
      isDeleted: true,
    },
  });
  return campuses;
}

async function getAllCampusCount() {
  const campuses = await db.Campus.count({
    where: {
      isActive: true,
      isDeleted: false,
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

  // Validation: Ensure isActive is set to false before deleting
  if (params.isDeleted && campus.isActive) {
    throw `You must set the Status of "${campus.campusName}" to Inactive before you can delete this campus.`;
  }

  Object.assign(campus, params);
  await campus.save();
}
