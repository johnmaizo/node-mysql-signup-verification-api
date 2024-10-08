const {Op, col} = require("sequelize");
const db = require("_helpers/db");

const deepEqual = require("deep-equal");

module.exports = {
  createProgramAssignCourse,
  getAllProgramAssignCourse,
  getProgramAssignCourseCount,
  getAllProgramAssignCourseActive,
  getAllProgramAssignCourseDeleted,
  // getCourseById,
  updateProgramAssignCourse,
};

async function createProgramAssignCourse(params, accountId) {
  const pLimit = await import("p-limit");

  const {programCode, courseCode, campus_id} = params;

  // Limit concurrency for parallel operations
  const limit = pLimit.default(5); // Adjust the limit based on your system capacity

  // Find the program based on programCode and campus_id via department association
  const program = await db.Program.findOne({
    where: {programCode: programCode},
    include: [
      {
        model: db.Department,
        where: {campus_id: campus_id},
        include: [{model: db.Campus, attributes: ["campusName"]}],
      },
    ],
  });

  if (!program) {
    throw new Error(
      `Program "${programCode}" not found for the specified campus.`
    );
  }

  // Handle both single and multiple courseCode inputs
  const courseCodes = Array.isArray(courseCode) ? courseCode : [courseCode];

  // Fetch all courses in one query to reduce multiple roundtrips to the database
  const courses = await db.CourseInfo.findAll({
    where: {
      courseCode: courseCodes,
      campus_id: campus_id, // Ensure the course belongs to the specified campus
    },
  });

  // Create a map of course codes for quick validation
  const courseMap = Object.fromEntries(
    courses.map((course) => [course.courseCode, course])
  );

  // Perform validation in parallel (with concurrency control)
  const validationResults = await Promise.all(
    courseCodes.map(async (code) => {
      return limit(async () => {
        const course = courseMap[code];

        // If the course doesn't exist on the campus, return an error
        if (!course) {
          return {
            error: `Course "${code}" not found on campus "${program.department.campus.campusName}".`,
          };
        }

        // Check if the course is already assigned to the program
        const existingProgramCourse = await db.ProgramCourse.findOne({
          where: {
            program_id: program.program_id,
            course_id: course.course_id,
          },
        });

        if (existingProgramCourse) {
          return {
            error: `Course "${code}" is already assigned to Program "${programCode}" on campus "${program.department.campus.campusName}".`,
          };
        }

        // If no errors, return the valid course object
        return {course};
      });
    })
  );

  // Check for validation errors
  const validationError = validationResults.find((result) => result.error);
  if (validationError) {
    throw new Error(validationError.error);
  }

  // Create a map of course ids for quick validation (key by course_id, not courseCode)
  const courseMap2nd = Object.fromEntries(
    courses.map((course) => [course.course_id, course]) // Keyed by course_id now
  );

  // Proceed to create associations in bulk after validations pass
  const newProgramCourses = validationResults.map((result) => ({
    program_id: program.program_id,
    course_id: result.course.course_id,
  }));

  // Bulk insert the new program-course associations and capture the inserted records
  const insertedProgramCourses = await db.ProgramCourse.bulkCreate(
    newProgramCourses,
    {
      returning: true, // Ensure Sequelize returns the created records with their IDs
    }
  );

  // Log history actions in bulk using programCourse_id from the inserted records
  const historyLogs = insertedProgramCourses.map((programCourse) => ({
    action: "create",
    entity: "ProgramCourse",
    entityId: programCourse.programCourse_id, // Use the programCourse_id here
    changes: {
      programCode,
      courseCode: courseMap2nd[programCourse.course_id].courseCode, // Access the courseCode using course_id from courseMap2nd
      campus_id,
    },
    accountId: accountId,
  }));

  // Bulk insert history logs
  await db.History.bulkCreate(historyLogs);
}

// Common function to handle the transformation
function transformProgramCourseData(programCourse) {
  return {
    ...programCourse.toJSON(),
    courseCode: programCourse.courseinfo.courseCode || null,
    courseDescription: programCourse.courseinfo.courseDescription || null,
    departmentCode: programCourse.program.department.departmentCode || null,
    departmentName: programCourse.program.department.departmentName || null,
    fullProgramDescriptionWithCourseAndCampus:
      `${programCourse.program.programCode} - ${programCourse.program.programDescription} - ${programCourse.courseinfo.courseCode} - ${programCourse.courseinfo.courseDescription} - ${programCourse.program.department.campus.campusName}` ||
      "fullProgramDescriptionWithCourseAndCampus not found",
    fullDepartmentNameWithCampusForSubject: programCourse.courseinfo.department
      ? `${programCourse.courseinfo.department.departmentCode} - ${programCourse.courseinfo.department.departmentName} - ${programCourse.courseinfo.department.campus.campusName}`
      : null,
  };
}

// Helper function to generate include conditions
function getIncludeConditionsForProgramCourse(
  programCode,
  program_id,
  campus_id,
  campusName
) {
  console.log(
    `\n\n\n\nPROGRAM CODE: ${programCode}, PROGRAM ID: ${program_id}, CAMPUS ID: ${campus_id}, CAMPUS NAME: ${campusName}\n\n\n\n\n`
  );

  const includeConditions = [
    {
      model: db.Program,
      where:
        programCode && program_id
          ? {programCode: programCode, program_id: program_id}
          : program_id
          ? {program_id: program_id}
          : programCode
          ? {programCode: programCode}
          : undefined,
      include: [
        {
          model: db.Department,
          include: [
            {
              model: db.Campus,
              attributes: ["campusName"], // Include only the campus name
              where: campusName ? {campusName: campusName} : undefined,
            },
          ],
          attributes: ["departmentName", "departmentCode"], // Include department name and code
        },
      ],
      attributes: ["programCode", "programDescription"], // Include program code and description
    },
    {
      model: db.CourseInfo,
      attributes: ["courseCode", "courseDescription", "unit"], // Include course code and description
      include: [
        {
          model: db.Department,
          include: [
            {
              model: db.Campus,
              attributes: ["campusName"], // Include only the campus name
              where: campusName ? {campusName: campusName} : undefined,
            },
          ],
          attributes: ["departmentName", "departmentCode"], // Include department name and code
        },
      ],
    },
  ];

  if (campus_id) {
    includeConditions[0].include[0].where = {
      ...includeConditions[0].include[0].where,
      campus_id: campus_id,
    };
  }

  if (campusName && !(campus_id && campusName)) {
    throw new Error(`It doesn't work.. ("${campusName}")`);
  }

  return includeConditions;
}

// Function to validate campus_id and campusName match
async function validateCampus(campus_id, campusName) {
  if (campus_id && campusName) {
    const campus = await db.Campus.findOne({
      where: {campus_id, campusName},
    });

    if (!campus) {
      throw new Error(
        `Campus with ID "${campus_id}" and Name "${campusName}" does not match.`
      );
    }
  }
}

// Reuse the existing getProgramCourses function
async function getProgramCourses(
  whereClause,
  programCode = null,
  program_id = null,
  campus_id = null,
  campusName = null
) {
  const includeConditions = getIncludeConditionsForProgramCourse(
    programCode,
    program_id,
    campus_id,
    campusName
  );

  await validateCampus(campus_id, campusName);

  if (programCode && program_id) {
    const validProgram = await db.Program.findOne({
      where: {
        programCode: programCode,
        program_id: program_id,
      },
    });

    if (!validProgram) {
      throw new Error(
        `Program with ID "${program_id}" and Program Code "${programCode}" does not match.`
      );
    }
  }

  const programCourses = await db.ProgramCourse.findAll({
    where: whereClause,
    include: includeConditions,
  });

  return programCourses.map(transformProgramCourseData);
}

async function getAllProgramAssignCourse(
  programCode = null,
  program_id = null,
  campus_id = null,
  campusName = null
) {
  const whereClause = {isDeleted: false};

  return await getProgramCourses(
    whereClause,
    programCode,
    program_id,
    campus_id,
    campusName
  );
}

async function getProgramAssignCourseCount(
  programCode = null,
  program_id = null,
  campus_id = null,
  campusName = null
) {
  const whereClause = {isActive: true, isDeleted: false};

  await validateCampus(campus_id, campusName);

  const includeConditions = getIncludeConditionsForProgramCourse(
    programCode,
    program_id,
    campus_id,
    campusName
  );

  return await db.ProgramCourse.count({
    where: whereClause,
    include: includeConditions,
  });
}

async function getAllProgramAssignCourseActive(
  programCode = null,
  program_id = null,
  campus_id = null,
  campusName = null
) {
  const whereClause = {isActive: true, isDeleted: false};

  return await getProgramCourses(
    whereClause,
    programCode,
    program_id,
    campus_id,
    campusName
  );
}

async function getAllProgramAssignCourseDeleted(
  programCode = null,
  program_id = null,
  campus_id = null,
  campusName = null
) {
  const whereClause = {isDeleted: true};

  return await getProgramCourses(
    whereClause,
    programCode,
    program_id,
    campus_id,
    campusName
  );
}

async function updateProgramAssignCourse(id, params, accountId) {
  const {courseCode, campus_id, isDeleted} = params;

  // Fetch the program-course association as a Sequelize instance
  const programCourse = await db.ProgramCourse.findByPk(id, {
    include: [
      {
        model: db.Program,
        include: [
          {
            model: db.Department,
            where: {
              campus_id: campus_id, // Ensure the department belongs to the specified campus
            },
            include: [
              {
                model: db.Campus,
                attributes: ["campusName"], // Include campus name for error messages
              },
            ],
          },
        ],
      },
      {
        model: db.CourseInfo,
        attributes: ["courseCode"], // Include only the course code
      },
    ],
  });

  if (!programCourse) throw new Error("Program-Course association not found");

  const program = programCourse.Program;

  // Check if the action is only to delete the program-course association
  if (isDeleted !== undefined) {
    if (isDeleted && programCourse.isActive) {
      throw new Error(
        `You must set the Status of the Program-Course association to Inactive before you can delete it.`
      );
    }

    programCourse.isDeleted = isDeleted;
    await programCourse.save();

    // Log the update action
    await db.History.create({
      action: "update",
      entity: "ProgramCourse",
      entityId: programCourse.programCourse_id,
      changes: params,
      accountId: accountId,
    });

    return;
  }

  // Find the course based on courseCode and campus_id
  const course = await db.CourseInfo.findOne({
    where: {
      courseCode: courseCode,
      campus_id: campus_id, // Ensure the course belongs to the specified campus
    },
  });

  if (!course) {
    throw new Error(
      `Course "${courseCode}" not found on campus "${program.department.campus.campusName}".`
    );
  }

  // Check if the course is already assigned to the program on the same campus and it's not the same association being updated
  const existingProgramCourse = await db.ProgramCourse.findOne({
    where: {
      program_id: program.program_id,
      course_id: course.course_id,
      programCourse_id: {[Op.ne]: id},
      // isDeleted: false,
    },
  });

  if (existingProgramCourse) {
    throw new Error(
      `Course "${courseCode}" is already assigned to Program "${program.programCode}" on campus "${program.department.campus.campusName}".`
    );
  }

  // Log the original state before the update
  const originalData = {...programCourse.dataValues};

  // Update program-course association with new params
  programCourse.program_id = program.program_id;
  programCourse.course_id = course.course_id;
  await programCourse.save();

  // Check if there are actual changes
  const hasChanges = !deepEqual(originalData, programCourse.dataValues);

  if (hasChanges) {
    // Log the update action with changes
    const changes = {
      original: originalData,
      updated: params,
    };

    // Log the update action
    await db.History.create({
      action: "update",
      entity: "ProgramCourse",
      entityId: programCourse.programCourse_id,
      changes: changes,
      accountId: accountId,
    });
  }
}
