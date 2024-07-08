const {Op} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

module.exports = {
  getAllTeachers,
  getPreviousTotalTeachers,
  createTeacher,
  getTeacherById,
  updateTeacher,
};

async function createTeacher(params) {
  // validate
  if (await db.TeacherInfo.findOne({where: {email: params.email}})) {
    throw 'Email "' + params.email + '" is already registered';
  }

  const teacher = new db.TeacherInfo(params);

  // save teacher
  await teacher.save();
}

async function getAllTeachers() {
  const teacher = await db.TeacherInfo.findAll();
  
  return teacher.map((x) => teacherBasicDetails(x));
}

async function getTeacherById(id) {
  const teacher = await db.TeacherInfo.findByPk(id);
  if (!teacher) throw "Teacher not found";
  return teacher;
}

async function updateTeacher(id, params) {
  const teacher = await getTeacherById(id);

  if (!teacher) throw "Teacher not found";

  if (params.email !== teacher.email && await db.TeacherInfo.findOne({where: {email: params.email}})) {
    throw 'Email "' + params.email + '" is already registered';
  }

  Object.assign(teacher, params);
  await teacher.save();
}

async function getPreviousTotalTeachers() {
  const today = new Date();
  const firstDayOfPreviousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastDayOfPreviousMonth = new Date(today.getFullYear(), today.getMonth(), 0);

  const previousTotalTeachers = await db.TeacherInfo.count({
    where: {
      createdAt: {
        [Op.between]: [firstDayOfPreviousMonth, lastDayOfPreviousMonth],
      },
    },
  });

  return previousTotalTeachers || 0;
}




function teacherBasicDetails(teacher) {
  const {
    teacher_id,
    firstName,
    middleName,
    lastName,
    teacherAddress,
    contactNumber,
    email,
    isActive,
    department_id,

    createdAt,
  } = teacher;
  return {
    teacher_id,
    firstName,
    middleName,
    lastName,
    teacherAddress,
    contactNumber,
    email,
    isActive,
    department_id,



    createdAt,
  };
}