const { Op } = require("sequelize");
const db = require("_helpers/db");

module.exports = {
  createDepartment,
  getAllDepartment,
  getAllDepartmentsActive,
  getDepartmentById,
  updateDepartment,
};

async function createDepartment(params) {
  // validate if departmentCode exists on the same campus_id
  const existingDepartment = await db.Department.findOne({
    where: {
      departmentCode: params.departmentCode,
      campus_id: params.campus_id
    }
  });

  if (existingDepartment) {
    throw `Department Code "${params.departmentCode}" is already registered on campus ID "${params.campus_id}".`;
  }

  const department = new db.Department(params);

  // save department
  await department.save();
}

async function getAllDepartment() {
  const department = await db.Department.findAll();
  return department;
}

async function getAllDepartmentsActive() {
  const departments = await db.Department.count({
    where: {
      isActive: true,
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

  Object.assign(department, params);
  await department.save();
}
