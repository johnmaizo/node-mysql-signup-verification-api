const {Op} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

module.exports = {
  createStudent,
  getAllStudents,
  getAllStudentsActive,
  getPreviousTotalStudents,
  getPreviousTotalStudentsActive,

  getStudentById,
  updateStudent,
  // deleteStudent,
};

async function createStudent(params) {
  // validate
  if (await db.Student.findOne({where: {email: params.email}})) {
    throw 'Email "' + params.email + '" is already registered';
  }

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

async function getAllStudentsActive() {
  const students = await db.Student.count({
    where: {
      isActive: true,
    },
  });
  return students;
}

async function getStudentById(id) {
  const student = await db.Student.findByPk(id);
  if (!student) throw "Student not found";
  return student;
}

async function updateStudent(id, params) {
  const student = await getStudentById(id);

  if (!student) throw "Student not found";

  // validate (if email was changed)
  if (
    params.email &&
    student.email !== params.email &&
    (await db.Student.findOne({where: {email: params.email}}))
  ) {
    throw 'Email "' + params.email + '" is already taken';
  }

  Object.assign(student, params);
  await student.save();
}

async function getPreviousTotalStudents() {
  const today = new Date();
  const firstDayOfPreviousMonth = new Date(
    today.getFullYear(),
    today.getMonth() - 1,
    1
  );
  const lastDayOfPreviousMonth = new Date(
    today.getFullYear(),
    today.getMonth(),
    0
  );

  const previousTotalStudents = await db.Student.count({
    where: {
      createdAt: {
        [Op.between]: [firstDayOfPreviousMonth, lastDayOfPreviousMonth],
      },
    },
  });

  return previousTotalStudents || 0;
}


async function getPreviousTotalStudentsActive() {
  const today = new Date();
  const firstDayOfPreviousMonth = new Date(
    today.getFullYear(),
    today.getMonth() - 1,
    1
  );
  const lastDayOfPreviousMonth = new Date(
    today.getFullYear(),
    today.getMonth(),
    0
  );

  const previousTotalStudentsActive = await db.Student.count({
    where: {
      createdAt: {
        [Op.between]: [firstDayOfPreviousMonth, lastDayOfPreviousMonth],
      },
      isActive: true
    },
  });

  return previousTotalStudentsActive || 0;
}






// ! Student Basic Details

function studentBasicDetails(student) {
  const {
    student_id,
    firstName,
    middleName,
    lastName,
    gender,
    email,
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
    email,
    civilStatus,
    ACR,
    isActive,

    createdAt,
  };
}
