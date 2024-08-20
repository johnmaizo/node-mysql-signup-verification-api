const {Op, where} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

module.exports = {
  createSemester,
  getAllSemester,
  getAllSemesterActive,
  getAllSemesterDeleted,
  getSemesterById,
  updateSemester,
};

async function createSemester(params) {
  // Validate if schoolYear exists on the same semesterName
  const existingSemester = await db.Semester.findOne({
    where: {
      schoolYear: params.schoolYear,
      semesterName: params.semesterName,
    },
  });

  if (existingSemester) {
    throw `Error: School Year "${params.schoolYear}" is already registered on Semester "${params.semesterName}".`;
  }

  const semester = new db.Semester(params);

  // save semester
  await semester.save();
}

async function getAllSemester() {
  const semester = await db.Semester.findAll({
    where: {
      isDeleted: false,
    },
  });

  return semester;
}

async function getAllSemesterActive() {
  const semesteres = await db.Semester.findAll({
    where: {
      isActive: true,
      isDeleted: false,
    },
  });
  return semesteres;
}

async function getAllSemesterDeleted() {
  const semesters = await db.Semester.findAll({
    where: {
      isDeleted: true,
    },
  });
  return semesters;
}

async function getSemesterById(id) {
  const semester = await db.Semester.findByPk(id);
  if (!semester) throw "Semester not found";
  return semester;
}

async function updateSemester(id, params) {
  const semester = await getSemesterById(id);

  if (!semester) throw "Semester not found";

  // If schoolYear or semesterName are not provided, use existing values
  const schoolYear = params.schoolYear || semester.schoolYear;
  const semesterName = params.semesterName || semester.semesterName;

  // Validate if schoolYear exists on the same semesterName
  const existingSemester = await db.Semester.findOne({
    where: {
      schoolYear: schoolYear,
      semesterName: semesterName,
      semester_id: {[Op.ne]: id}, // Ensure the Semester being updated is excluded from this check
    },
  });

  if (existingSemester) {
    throw `Error: School Year "${params.schoolYear}" is already registered on Semester "${params.semesterName}".`;
  }

  Object.assign(semester, params);
  await semester.save();
}
