const {Op} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

module.exports = {
  getAllTeachers,
  getPreviousTotalTeachers,
  createTeachers,
  getTeacherById,
  updateTeacher,
};

async function createTeachers(params) {
  // validate
  if (await db.TeacherInfo.findOne({where: {email: params.email}})) {
    throw 'Email "' + params.email + '" is already registered';
  }

  // params.student_id = await generateStudentId();


  const teacher = new db.TeacherInfo(params);

  // save student
  await teacher.save();
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

async function getAllTeachers() {
  const teacher = await db.Student.findAll();
  return teacher.map((x) => teacherBasicDetails(x));
}

async function getTeacherById(id) {
  const teacher = await db.TeacherInfo.findByPk(id);
  if (!teacher) throw "Teacher not found";
  return teacherBasicDetails;
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


    createdAt,
  };
}