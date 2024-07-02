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

  const student = new db.Student(params);
  
  // save student
  await student.save();

  // return studentBasicDetails(student);
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
