const {Op, fn, col} = require("sequelize");
const db = require("_helpers/db");

const deepEqual = require("deep-equal");

module.exports = {
  createDepartment,
  getAllDepartment,
  getAllDepartmentCount,
  getAllDepartmentsActive,
  getAllDepartmentsDeleted,
  getDepartmentById,
  updateDepartment,
  getAllCampusIds,
};

async function createDepartment(params, accountId) {
  // Validate if departmentCode exists on the same campus_id
  const existingDepartment = await db.Department.findOne({
    where: {
      departmentCode: params.departmentCode,
      campus_id: params.campus_id,
    },
  });

  // Validate if departmentName exists on the same campus_id
  const existingDepartmentName = await db.Department.findOne({
    where: {
      departmentName: params.departmentName,
      campus_id: params.campus_id,
    },
  });

  // Get the campusName based on campus_id
  const campus = await db.Campus.findByPk(params.campus_id);
  if (!campus) {
    throw `Campus with ID "${params.campus_id}" not found.`;
  }

  if (existingDepartment) {
    throw `Department Code "${params.departmentCode}" is already registered on campus "${campus.campusName}".`;
  }

  if (existingDepartmentName) {
    throw `Department Name "${params.departmentName}" already exists on campus "${campus.campusName}".`;
  }

  const department = new db.Department(params);

  // Save department
  await department.save();

  // Log the creation action
  await db.History.create({
    action: "create",
    entity: "Deparment",
    entityId: department.department_id,
    changes: params,
    accountId: accountId,
  });
}

// Common function to handle the transformation
function transformDepartmentData(department) {
  return {
    ...department.toJSON(),
    fullDepartmentNameWithCampus:
      `${department.departmentCode} - ${department.departmentName} - ${department.campus.campusName}` ||
      "fullDepartmentNameWithCampus not found",
    campusName: department.campus.campusName || "campusName not found",
  };
}

// Common function to get departments based on filter conditions
async function getDepartments(whereClause) {
  const departments = await db.Department.findAll({
    where: whereClause,
    include: [
      {
        model: db.Campus,
        attributes: ["campusName"], // Include only the campus name
      },
    ],
  });

  return departments.map(transformDepartmentData);
}

async function getAllDepartment(campus_id = null) {
  const whereClause = {isDeleted: false};

  if (campus_id) {
    whereClause.campus_id = campus_id;
  }

  return await getDepartments(whereClause);
}

async function getAllDepartmentCount(campus_id = null) {
  const whereClause = {isActive: true, isDeleted: false};

  if (campus_id) {
    whereClause.campus_id = campus_id;
  }

  return await db.Department.count({
    where: whereClause,
  });
}

// New function to get all distinct campus IDs
async function getAllCampusIds() {
  const campuses = await db.Department.findAll({
    attributes: [
      [fn("DISTINCT", col("campus_id")), "campus_id"],
    ],
    where: {isActive: true, isDeleted: false},
  });

  return campuses.map((campus) => campus.campus_id);
}

async function getAllDepartmentsActive(campus_id = null) {
  const whereClause = {isActive: true, isDeleted: false};

  if (campus_id) {
    whereClause.campus_id = campus_id;
  }

  return await getDepartments(whereClause);
}

async function getAllDepartmentsDeleted(campus_id = null) {
  const whereClause = {isDeleted: true};

  if (campus_id) {
    whereClause.campus_id = campus_id;
  }

  return await getDepartments(whereClause);
}

async function getDepartmentById(id) {
  const department = await db.Department.findByPk(id, {
    include: [
      {
        model: db.Campus,
        attributes: ["campusName"], // Include only the campus name
      },
    ],
  });

  if (!department) throw new Error("Department not found");

  return transformDepartmentData(department);
}

async function updateDepartment(id, params, accountId) {
  const department = await db.Department.findByPk(id);

  if (!department) throw "Department not found";

  // Check if the action is only to delete the department
  if (params.isDeleted !== undefined) {
    if (params.isDeleted && department.isActive) {
      throw new Error(
        `You must set the Status of "${department.departmentName}" to Inactive before you can delete this department.`
      );
    }

    Object.assign(department, {isDeleted: params.isDeleted});
    await department.save();

    // Log the update action
    await db.History.create({
      action: "update",
      entity: "Department",
      entityId: department.department_id,
      changes: params,
      accountId: accountId,
    });

    return;
  }

  // Log the original state before update
  const originalData = {...department.dataValues};

  // If departmentCode or campus_id are not provided, use existing values
  const departmentCode = params.departmentCode || department.departmentCode;
  const campus_id = params.campus_id || department.campus_id;

  // Validate if departmentCode exists on the same campus_id for another department
  const existingDepartment = await db.Department.findOne({
    where: {
      departmentCode: departmentCode,
      campus_id: campus_id,
      department_id: {[Op.ne]: id}, // Ensure the department being updated is excluded from this check
    },
  });

  // Validate if departmentName exists on the same campus_id for another department
  const existingDepartmentName = await db.Department.findOne({
    where: {
      departmentName: params.departmentName || department.departmentName,
      campus_id: campus_id,
      department_id: {[Op.ne]: id}, // Ensure the department being updated is excluded from this check
    },
  });

  if (existingDepartment) {
    const campus = await db.Campus.findByPk(campus_id);
    const campusName = campus ? campus.campusName : "Unknown";
    throw `Department Code "${departmentCode}" is already registered on campus "${campusName}".`;
  }

  if (existingDepartmentName) {
    const campus = await db.Campus.findByPk(campus_id);
    const campusName = campus ? campus.campusName : "Unknown";
    throw `Department Name "${params.departmentName}" already exists on campus "${campusName}".`;
  }

  // Update department with new params
  Object.assign(department, params);
  await department.save();

  // Check if there are actual changes
  const hasChanges = !deepEqual(originalData, department.dataValues);

  if (hasChanges) {
    // Log the update action with changes
    const changes = {
      original: originalData,
      updated: params,
    };

    // Log the update action
    await db.History.create({
      action: "update",
      entity: "Department",
      entityId: department.department_id,
      changes: changes,
      accountId: accountId,
    });
  }
}
