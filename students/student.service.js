const {Op} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

module.exports = {
  getAllStudents,
  createStudent,
  getStudentById,
  // updateStudent,
  // deleteStudent,
};

async function createStudent(params) {
  //   if (await db.student.findOne({where: {email: params.email}})) {
  // if (await db.StudentContact.findOne({where: {email: params.email}})) {
  //   throw 'Email "' + params.email + '" is already exist!';
  // }
  params.student_id = await generateStudentId();

  const student = new db.Student(params);

  // save student
  await student.save();
}

/**
 * Generates a unique student ID based on the current year and the existing student IDs in the database.
 *
 * @return {string} The generated unique student ID.
 */
async function generateStudentId() {
  const currentYear = new Date().getFullYear().toString();
  const lastStudent = await db.Student.findOne({
    where: {
      student_id: {
        [Op.like]: `${currentYear}%`,
      },
    },
    order: [["createdAt", "DESC"]],
  });

  if (lastStudent) {
    const lastId = lastStudent.student_id.split("-")[1];
    const newIdNumber = (parseInt(lastId) + 1).toString().padStart(5, "0");
    return `${currentYear}-${newIdNumber}`;
  } else {
    return `${currentYear}-00001`;
  }
}

async function getAllStudents() {
  const student = await db.Student.findAll();
  return student.map((x) => studentBasicDetails(x));
}

async function getStudentById(id) {
  const student = await db.Student.findByPk(id);
  if (!student) throw "Student not found";
  return student;
}

function studentBasicDetails(student) {
  const {
    student_id,
    firstName,
    middleName,
    lastName,
    gender,
    civilStatus,
    ACR,
    isActive,

    createdAt,
  } = student;
  return {
    student_id,
    firstName,
    middleName,
    lastName,
    gender,
    civilStatus,
    ACR,
    isActive,


    createdAt,
  };
}
