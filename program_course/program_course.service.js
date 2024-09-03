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

async function createProgramAssignCourse(params, adminId) {
  const {programCode, courseCode, campus_id} = params;

  // Find the program based on programCode and campus_id via department association
  const program = await db.Program.findOne({
    where: {
      programCode: programCode,
    },
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
  });

  if (!program) {
    throw new Error(
      `Program "${programCode}" not found for the specified campus.`
    );
  }

  // Handle both single and multiple courseCode inputs
  const courseCodes = Array.isArray(courseCode) ? courseCode : [courseCode];

  // Validation step: Check all course codes before making any changes
  const courseValidationResults = await Promise.all(
    courseCodes.map(async (code) => {
      const course = await db.CourseInfo.findOne({
        where: {
          courseCode: code,
          campus_id: campus_id, // Ensure the course belongs to the specified campus
        },
      });

      if (!course) {
        return {
          error: `Course "${code}" not found on campus "${program.department.campus.campusName}".`,
        };
      }

      // Check if the course is already assigned to the program on the same campus
      const existingProgramCourse = await db.ProgramCourse.findOne({
        where: {
          program_id: program.program_id,
          course_id: course.course_id,
          // isDeleted: false,
        },
      });

      if (existingProgramCourse) {
        return {
          error: `Course "${code}" is already assigned to Program "${programCode}" on campus "${program.department.campus.campusName}".`,
        };
      }

      // If validation passes, return the course object
      return {course};
    })
  );

  // Check if any validation errors occurred
  const validationError = courseValidationResults.find(
    (result) => result.error
  );

  if (validationError) {
    throw new Error(validationError.error);
  }

  // Proceed to create associations after all validations pass
  for (const result of courseValidationResults) {
    const {course} = result;

    // Create the new program-course association
    const programCourse = new db.ProgramCourse({
      program_id: program.program_id,
      course_id: course.course_id,
    });

    // Save the association
    await programCourse.save();

    // Log the creation action
    await db.History.create({
      action: "create",
      entity: "ProgramCourse",
      entityId: programCourse.programCourse_id,
      changes: {
        programCode,
        courseCode: course.courseCode,
        campus_id,
      },
      adminId: adminId,
    });
  }
}

// Common function to handle the transformation
function transformProgramCourseData(programCourse) {
  return {
    ...programCourse.toJSON(),
    fullProgramDescriptionWithCourseAndCampus:
      `${programCourse.program.programCode} - ${programCourse.program.programDescription} - ${programCourse.courseinfo.courseCode} - ${programCourse.courseinfo.courseDescription} - ${programCourse.program.department.campus.campusName}` ||
      "fullProgramDescriptionWithCourseAndCampus not found",
  };
}

// Helper function to generate include conditions
function getIncludeConditionsForProgramCourse(
  program_id,
  campus_id,
  campusName
) {
  const includeConditions = [
    {
      model: db.Program,
      where: program_id ? {program_id: program_id} : undefined,
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
      attributes: ["courseCode", "courseDescription"], // Include course code and description
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
  program_id = null,
  campus_id = null,
  campusName = null
) {
  const includeConditions = getIncludeConditionsForProgramCourse(
    program_id,
    campus_id,
    campusName
  );

  await validateCampus(campus_id, campusName);

  const programCourses = await db.ProgramCourse.findAll({
    where: whereClause,
    include: includeConditions,
  });

  return programCourses.map(transformProgramCourseData);
}

async function getAllProgramAssignCourse(
  program_id = null,
  campus_id = null,
  campusName = null
) {
  const whereClause = {isDeleted: false};

  return await getProgramCourses(
    whereClause,
    program_id,
    campus_id,
    campusName
  );
}

async function getProgramAssignCourseCount(
  program_id = null,
  campus_id = null,
  campusName = null
) {
  const whereClause = {isActive: true, isDeleted: false};

  await validateCampus(campus_id, campusName);

  const includeConditions = getIncludeConditionsForProgramCourse(
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
  program_id = null,
  campus_id = null,
  campusName = null
) {
  const whereClause = {isActive: true, isDeleted: false};

  return await getProgramCourses(
    whereClause,
    program_id,
    campus_id,
    campusName
  );
}

async function getAllProgramAssignCourseDeleted(
  program_id = null,
  campus_id = null,
  campusName = null
) {
  const whereClause = {isDeleted: true};

  return await getProgramCourses(
    whereClause,
    program_id,
    campus_id,
    campusName
  );
}

async function updateProgramAssignCourse(id, params, adminId) {
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
      adminId: adminId,
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
      adminId: adminId,
    });
  }
}
