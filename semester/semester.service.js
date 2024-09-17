const {Op} = require("sequelize");
const db = require("_helpers/db");

const deepEqual = require("deep-equal");

module.exports = {
  createSemester,
  getAllSemester,
  getAllSemesterActive,
  getAllSemesterDeleted,
  getSemesterById,
  updateSemester,
};

async function createSemester(params, accountId) {
  const {semesterName, schoolYear, campus_id} = params;

  // Check if there's already an active semester on the same campus
  const activeSemester = await db.Semester.findOne({
    where: {
      isActive: true,
      isDeleted: false,
      campus_id: campus_id,
    },
  });

  if (activeSemester) {
    throw `Error: There's currently an active semester: "${activeSemester.semesterName} - S.Y. "${activeSemester.schoolYear}". You must inactivate it in order to add a new semester.`;
  }

  // Check existing semesters for the given school year and campus_id, including deleted ones
  const existingSemesters = await db.Semester.findAll({
    where: {
      schoolYear: schoolYear,
      campus_id: campus_id,
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

  // Validate if the same schoolYear and semesterName already exists on the same campus
  const existingSemester = await db.Semester.findOne({
    where: {
      schoolYear: schoolYear,
      semesterName: semesterName,
      campus_id: campus_id,
    },
  });

  if (existingSemester) {
    throw `Error: The semester "${semesterName}" for the school year "${schoolYear}" already exists.`;
  }

  // Get the campusName based on campus_id
  const campus = await db.Campus.findByPk(campus_id);
  if (!campus) {
    throw `Campus with ID "${campus_id}" not found.`;
  }

  const semester = new db.Semester(params);

  // Save semester
  await semester.save();

  // Log the creation action
  await db.History.create({
    action: "create",
    entity: "Semester",
    entityId: semester.semester_id,
    changes: params,
    accountId: accountId,
  });
}

// Common function to handle the transformation
function transformSemesterData(semester) {
  return {
    ...semester.toJSON(),
    fullSemesterNameWithCampus:
      `${semester.schoolYear} - ${semester.semesterName} - ${semester.campus.campusName}` ||
      "fullSemesterNameWithCampus not found",
    campusName: semester.campus.campusName || "campusName not found",
  };
}

// Common function to get semesters based on filter conditions
async function getSemesters(whereClause) {
  const semesters = await db.Semester.findAll({
    where: whereClause,
    include: [
      {
        model: db.Campus,
        attributes: ["campusName"], // Include only the campus name
      },
    ],
  });

  return semesters.map(transformSemesterData);
}

async function getAllSemester(campus_id = null) {
  const whereClause = {isDeleted: false};

  if (campus_id) {
    whereClause.campus_id = campus_id;
  }

  return await getSemesters(whereClause);
}

async function getAllSemesterActive(campus_id = null) {
  const whereClause = {isActive: true, isDeleted: false};

  if (campus_id) {
    whereClause.campus_id = campus_id;
  }

  return await getSemesters(whereClause);
}

async function getAllSemesterDeleted(campus_id = null) {
  const whereClause = {isDeleted: true};

  if (campus_id) {
    whereClause.campus_id = campus_id;
  }

  return await getSemesters(whereClause);
}

async function getSemesterById(id) {
  const semester = await db.Semester.findByPk(id);
  if (!semester) throw "Semester not found";
  return semester;
}

async function updateSemester(id, params, accountId) {
  const semester = await getSemesterById(id);

  if (!semester) throw "Semester not found";

  // Check if the action is only to delete the semester
  if (params.isDeleted !== undefined) {
    if (params.isDeleted && semester.isActive) {
      throw new Error(
        `You must set the Status of "${semester.semesterName} - S.Y. ${semester.schoolYear}" to Inactive before you can delete this semester.`
      );
    }

    Object.assign(semester, {isDeleted: params.isDeleted});
    await semester.save();

    // Log the update action
    await db.History.create({
      action: "update",
      entity: "Semester",
      entityId: semester.semester_id,
      changes: params,
      accountId: accountId,
    });

    return;
  }

  // Log the original state before update
  const originalData = {...semester.dataValues};

  // If semesterName, schoolYear, or campus_id are not provided, use existing values
  const semesterName = params.semesterName || semester.semesterName;
  const schoolYear = params.schoolYear || semester.schoolYear;
  const campus_id = params.campus_id || semester.campus_id;

  // Check if there's already an active semester (other than the one being updated) on the same campus
  if (params.isActive) {
    const activeSemester = await db.Semester.findOne({
      where: {
        isActive: true,
        isDeleted: false,
        campus_id: campus_id,
        semester_id: {[Op.ne]: id}, // Exclude the current semester from this check
      },
    });

    if (activeSemester) {
      throw `Error: There's currently an active semester: "${activeSemester.semesterName} - S.Y. ${activeSemester.schoolYear}". You must inactivate it in order to activate this semester.`;
    }
  }

  // Validate if the same schoolYear and semesterName combination already exists on the same campus (other than the one being updated)
  const duplicateSemester = await db.Semester.findOne({
    where: {
      schoolYear: schoolYear,
      semesterName: semesterName,
      campus_id: campus_id,
      semester_id: {[Op.ne]: id},
    },
  });

  if (duplicateSemester) {
    throw `Error: The semester "${semesterName}" for the school year "${schoolYear}" already exists.`;
  }

  // Validation based on semesterName
  const existingSemesters = await db.Semester.findAll({
    where: {
      schoolYear: schoolYear,
      campus_id: campus_id,
      semester_id: {[Op.ne]: id},
    },
    order: [["semesterName", "ASC"]],
  });

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

  // Get the campusName based on campus_id
  const campus = await db.Campus.findByPk(campus_id);
  if (!campus) {
    throw `Campus with ID "${campus_id}" not found.`;
  }

  // If validation passes, update the semester
  Object.assign(semester, params);
  await semester.save();

  // Check if there are actual changes
  const hasChanges = !deepEqual(originalData, semester.dataValues);

  if (hasChanges) {
    // Log the update action with changes
    const changes = {
      original: originalData,
      updated: params,
    };

    // Log the update action
    await db.History.create({
      action: "update",
      entity: "Semester",
      entityId: semester.semester_id,
      changes: changes,
      accountId: accountId,
    });
  }
}
