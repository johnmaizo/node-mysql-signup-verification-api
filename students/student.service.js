const {Op} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

module.exports = {
  // getAllStudent,
  createStudent,
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

function studentBasicDetails(student) {
  const {
    student_id,
    firstName,
    middleName,
    lastName,
    gender,
    civilStatus,
    birthDate,
    birthPlace,
    religion,
    citizenship,
    country,
    ACR,

    createdAt,
  } = student;
  return {
    student_id,
    firstName,
    middleName,
    lastName,
    gender,
    civilStatus,
    birthDate,
    birthPlace,
    religion,
    citizenship,
    country,
    ACR,

    createdAt,
  };
}
