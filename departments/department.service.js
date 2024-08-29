const {Op} = require("sequelize");
const db = require("_helpers/db");

module.exports = {
  createDepartment,
  getAllDepartment,
  getAllDepartmentCount,
  getAllDepartmentsActive,
  getAllDepartmentsDeleted,
  getDepartmentById,
  updateDepartment,
};

async function createDepartment(params) {
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
}

// Common function to handle the transformation
function transformDepartmentData(department) {
  return {
    ...department.toJSON(),
    fullDepartmentNameWithCampus:
      `${department.departmentCode} - ${department.departmentName} - ${department.campus.campusName}` ||
      "fullDepartmentNameWithCampus not found",
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

async function getAllDepartment() {
  return await getDepartments({isDeleted: false});
}

async function getAllDepartmentCount() {
  return await db.Department.count({
    where: {isActive: true, isDeleted: false},
  });
}

async function getAllDepartmentsActive() {
  return await getDepartments({isActive: true, isDeleted: false});
}

async function getAllDepartmentsDeleted() {
  return await getDepartments({isDeleted: true});
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

async function updateDepartment(id, params) {
  const department = await db.Department.findByPk(id);

  if (!department) throw "Department not found";

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

  // Validation: Ensure isActive is set to false before deleting
  if (params.isDeleted && department.isActive) {
    throw `You must set the Status of "${department.departmentName}" to Inactive before you can delete this department.`;
  }

  // Update department with new params
  Object.assign(department, params);
  await department.save();
}
