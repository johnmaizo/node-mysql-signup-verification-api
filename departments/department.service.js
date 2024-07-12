const {Op} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

module.exports = {
  createDepartment,
  getAllDepartment,
  getAllDepartmentsActive,
  getDepartmentById,
  updateDepartment,
};

async function createDepartment(params) {
  // validate
  if (await db.Department.findOne({where: {departmentCode: params.departmentCode}})) {
    throw 'Department Code "' + params.departmentCode + '" is already registered';
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
  const students = await db.Department.count({
    where: {
      isActive: true,
    },
  });
  return students;
}

async function getDepartmentById(id) {
  const department = await db.Department.findByPk(id);
  if (!department) throw "Department not found";
  return departmentBasicDetails;
}

async function updateDepartment(id, params) {
  const department = await getDepartmentById(id);

  if (!department) throw "Department not found";

  Object.assign(department, params);
  await department.save();
}
