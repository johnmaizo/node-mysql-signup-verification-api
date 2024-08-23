const { Op } = require("sequelize");
const db = require("_helpers/db");

module.exports = {
  createDepartment,
  getAllDepartment,
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
      campus_id: params.campus_id
    }
  });
  
  // Get the campusName based on campus_id
  const campus = await db.Campus.findByPk(params.campus_id);
  if (!campus) {
    throw `Campus with ID "${params.campus_id}" not found.`;
  }

  if (existingDepartment) {
    throw `Department Code "${params.departmentCode}" is already registered on campus "${campus.campusName}".`;
  }

  // Assign the campusName to params
  params.campusName = campus.campusName;

  const department = new db.Department(params);

  // Save department
  await department.save();
}

async function getAllDepartment() {
  const department = await db.Department.findAll({
    where: {
      isDeleted: false,
    }
  });
  return department;
}

async function getAllDepartmentsActive() {
  const departments = await db.Department.findAll({
    where: {
      isActive: true,
      isDeleted: false,
    },
  });
  return departments;
}

async function getAllDepartmentsDeleted() {
  const departments = await db.Department.findAll({
    where: {
      isDeleted: true,
    },
  });
  return departments;
}

async function getDepartmentById(id) {
  const department = await db.Department.findByPk(id);
  if (!department) throw "Department not found";
  return department;
}

async function updateDepartment(id, params) {
  const department = await getDepartmentById(id);

  if (!department) throw "Department not found";

  // If departmentCode or campus_id are not provided, use existing values
  const departmentCode = params.departmentCode || department.departmentCode;
  const campus_id = params.campus_id || department.campus_id;

  // Validate if departmentCode exists on the same campus_id for another department
  const existingDepartment = await db.Department.findOne({
    where: {
      departmentCode: departmentCode,
      campus_id: campus_id,
      department_id: { [Op.ne]: id }  // Ensure the department being updated is excluded from this check
    }
  });

  if (existingDepartment) {
    const campus = await db.Campus.findByPk(campus_id);
    const campusName = campus ? campus.campusName : "Unknown";
    throw `Department Code "${departmentCode}" is already registered on campus "${campusName}".`;
  }

  // If campus_id is provided, get the campusName based on campus_id
  if (params.campus_id) {
    const campus = await db.Campus.findByPk(params.campus_id);
    if (!campus) {
      throw `Campus with ID "${params.campus_id}" not found.`;
    }
    params.campusName = campus.campusName;
  }

  // Validation: Ensure isActive is set to false before deleting
  if (params.isDeleted && department.isActive) {
    throw `You must set the Status of "${department.departmentName}" to Inactive before you can delete this department.`;
  }

  // Update department with new params
  Object.assign(department, params);
  await department.save();
}

