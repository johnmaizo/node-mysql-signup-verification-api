const {Op} = require("sequelize");
const db = require("_helpers/db");

module.exports = {
  createSemester,
  getAllSemester,
  getAllSemesterActive,
  getAllSemesterDeleted,
  getSemesterById,
  updateSemester,
};

async function createSemester(params) {
  const {semesterName, schoolYear} = params;

  // Check if there's already an active semester
  const activeSemester = await db.Semester.findOne({
    where: {
      isActive: true,
      isDeleted: false,
    },
  });

  if (activeSemester) {
    throw `Error: There's currently an active semester: "${activeSemester.semesterName}" for the school year "${activeSemester.schoolYear}". You must inactivate it in order to add a new semester.`;
  }

  // Check existing semesters for the given school year, including deleted ones
  const existingSemesters = await db.Semester.findAll({
    where: {
      schoolYear: schoolYear,
    },
    order: [["semesterName", "ASC"]],
  });

  // Validation based on semesterName
  if (semesterName === "2nd Semester") {
    const firstSemester = existingSemesters.find(
      (semester) => semester.semesterName === "1st Semester"
    );
    if (!firstSemester) {
      throw `Error: You need to create a 1st Semester for the school year "${schoolYear}" before adding a 2nd Semester.`;
    } else if (firstSemester.isDeleted) {
      throw `Error: The 1st Semester for the school year "${schoolYear}" is deleted. You must restore or recreate it before adding a 2nd Semester.`;
    }
  } else if (semesterName === "Summer") {
    const firstSemester = existingSemesters.find(
      (semester) => semester.semesterName === "1st Semester"
    );
    const secondSemester = existingSemesters.find(
      (semester) => semester.semesterName === "2nd Semester"
    );

    if (!firstSemester || !secondSemester) {
      throw `Error: You need to create both 1st Semester and 2nd Semester for the school year "${schoolYear}" before adding a Summer semester.`;
    } else if (firstSemester.isDeleted || secondSemester.isDeleted) {
      throw `Error: The 1st or 2nd Semester for the school year "${schoolYear}" is deleted. You must restore or recreate them before adding a Summer semester.`;
    }
  }

  // Validate if the same schoolYear and semesterName already exists
  const existingSemester = await db.Semester.findOne({
    where: {
      schoolYear: schoolYear,
      semesterName: semesterName,
    },
  });

  if (existingSemester) {
    throw `Error: The semester "${semesterName}" for the school year "${schoolYear}" already exists.`;
  }

  const semester = new db.Semester(params);

  // Save semester
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
  const semesters = await db.Semester.findAll({
    where: {
      isActive: true,
      isDeleted: false,
    },
  });
  return semesters;
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

  const {semesterName, schoolYear, isActive, isDeleted} = params;

  // Check if there's already an active semester (other than the one being updated)
  if (isActive) {
    const activeSemester = await db.Semester.findOne({
      where: {
        isActive: true,
        isDeleted: false,
        semester_id: {[Op.ne]: id}, // Exclude the current semester from this check
      },
    });

    if (activeSemester) {
      throw `Error: There's currently an active semester: "${activeSemester.semesterName}" for the school year "${activeSemester.schoolYear}". You must inactivate it in order to activate this semester.`;
    }
  }

  // Validation: Ensure isActive is set to false before deleting
  if (isDeleted && semester.isActive) {
    throw `You must set the Status of "${semester.schoolYear} - ${semester.semesterName}" to Inactive before you can delete this semester.`;
  }

  // Check existing semesters for the given school year, including deleted ones
  const existingSemesters = await db.Semester.findAll({
    where: {
      schoolYear: schoolYear || semester.schoolYear,
      semester_id: {[Op.ne]: id}, // Exclude the current semester from this check
    },
    order: [["semesterName", "ASC"]],
  });

  // Validation based on semesterName
  if (semesterName === "2nd Semester") {
    const firstSemesterExists = existingSemesters.some(
      (s) => s.semesterName === "1st Semester"
    );
    if (!firstSemesterExists) {
      throw `Error: You need to have a 1st Semester for the school year "${
        schoolYear || semester.schoolYear
      }" before adding or updating to a 2nd Semester.`;
    }
  } else if (semesterName === "Summer") {
    const firstSemesterExists = existingSemesters.some(
      (s) => s.semesterName === "1st Semester"
    );
    const secondSemesterExists = existingSemesters.some(
      (s) => s.semesterName === "2nd Semester"
    );
    if (!firstSemesterExists || !secondSemesterExists) {
      throw `Error: You need to have both 1st Semester and 2nd Semester for the school year "${
        schoolYear || semester.schoolYear
      }" before adding or updating to a Summer semester.`;
    }
  }

  // Validate if the same schoolYear and semesterName combination already exists (other than the one being updated)
  const duplicateSemester = await db.Semester.findOne({
    where: {
      schoolYear: schoolYear || semester.schoolYear,
      semesterName: semesterName || semester.semesterName,
      semester_id: {[Op.ne]: id},
    },
  });

  if (duplicateSemester) {
    throw `Error: The semester "${
      semesterName || semester.semesterName
    }" for the school year "${
      schoolYear || semester.schoolYear
    }" already exists.`;
  }

  // If validation passes, update the semester
  Object.assign(semester, params);
  await semester.save();
}
