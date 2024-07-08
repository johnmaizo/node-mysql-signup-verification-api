const {Op} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

module.exports = {
  getAllDepartment,
  getPreviousTotalDepartment,
  createDepartment,
  getDepartmentById,
  updateDepartment,
};

async function createDepartment(params) {
  // validate
  if (await db.Department.findOne({where: {email: params.email}})) {
    throw 'Email "' + params.email + '" is already registered';
  }
  const department = new db.Department(params);

  // save department
  await department.save();
}

/**
 * Generates a unique student ID based on the current year and the existing student IDs in the database.
 *
 * @return {string} The generated unique student ID.
 */
// async function generateStudentId() {
//   const currentYear = new Date().getFullYear().toString();
//   const lastStudent = await db.Student.findOne({
//     where: {
//       student_id: {
//         [Op.like]: `${currentYear}%`,
//       },
//     },
//     order: [["createdAt", "DESC"]],
//   });

//   if (lastStudent) {
//     const lastId = lastStudent.student_id.split("-")[1];
//     const newIdNumber = (parseInt(lastId) + 1).toString().padStart(5, "0");
//     return `${currentYear}-${newIdNumber}`;
//   } else {
//     return `${currentYear}-00001`;
//   }
// }

async function getAllDepartment() {
  const department = await db.Department.findAll();
  return department.map((x) => departmentBasicDetails(x));
}

async function getDepartmentById(id) {
  const department = await db.Department.findByPk(id);
  if (!department) throw "Department not found";
  return departmentBasicDetails;
}

async function updateDepartment(id, params) {
  const department = await getDepartmentById(id);

  if (!department) throw "Department not found";

  if (params.email !== department.email && await db.Department.findOne({where: {email: params.email}})) {
    throw 'Email "' + params.email + '" is already registered';
  }

  Object.assign(department, params);
  await department.save();
}

async function getPreviousTotalDepartment() {
  const today = new Date();
  const firstDayOfPreviousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastDayOfPreviousMonth = new Date(today.getFullYear(), today.getMonth(), 0);

  const getPreviousTotalDepartment = await db.Department.count({
    where: {
      createdAt: {
        [Op.between]: [firstDayOfPreviousMonth, lastDayOfPreviousMonth],
      },
    },
  });

  return getPreviousTotalDepartment || 0;
}




function departmentBasicDetails(teacher) {
  const {
    department_id,
    departmentName,
    isActive,

    createdAt,
  } = department;
  return {
    department_id,
    departmentName,
    isActive,
    
    createdAt,
  };
}