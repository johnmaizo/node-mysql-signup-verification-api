const {Op, where} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

const deepEqual = require("deep-equal");

module.exports = {
  createCampus,
  getAllCampus,
  getAllCampusActive,
  getAllCampusDeleted,
  getAllCampusCount,
  getCampusById,
  updateCampus,
};

async function createCampus(params, adminId) {
  // validate
  if (await db.Campus.findOne({where: {campusName: params.campusName}})) {
    throw 'Campus name "' + params.campusName + '" is already registered';
  }

  const campus = new db.Campus(params);

  // save campus
  await campus.save();

  // Log the creation action
  await db.History.create({
    action: "create",
    entity: "Campus",
    entityId: campus.campus_id,
    changes: params,
    adminId: adminId,
  });
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

async function updateCampus(id, params, adminId) {
  const campus = await getCampusById(id);

  if (!campus) throw "Campus not found";

  // Check if the action is only to delete the campus
  if (params.isDeleted !== undefined) {
    if (params.isDeleted && campus.isActive) {
      throw new Error(
        `You must set the Status of "${campus.campusName}" to Inactive before you can delete this campus.`
      );
    }

    Object.assign(campus, {isDeleted: params.isDeleted});
    await campus.save();

    // Log the update action
    await db.History.create({
      action: "update",
      entity: "Campus",
      entityId: campus.campus_id,
      changes: params,
      adminId: adminId,
    });

    return;
  }

  // Log the original state before update
  const originalData = {...campus.dataValues};

  Object.assign(campus, params);
  await campus.save();

  // Check if there are actual changes
  const hasChanges = !deepEqual(originalData, campus.dataValues);

  if (hasChanges) {
    // Log the update action with changes
    const changes = {
      original: originalData,
      updated: params,
    };

    // Log the update action
    await db.History.create({
      action: "update",
      entity: "Campus",
      entityId: campus.campus_id,
      changes: changes,
      adminId: adminId,
    });
  }
}
