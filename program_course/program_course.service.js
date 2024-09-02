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
  // Find the program based on programCode
  const program = await db.Program.findOne({
    where: {
      programCode: params.programCode,
    },
    include: [
      {
        model: db.Department,
        include: [
          {
            model: db.Campus,
          },
        ],
      },
    ],
  });

  if (!program) {
    throw new Error(`Program "${params.programCode}" not found.`);
  }

  const campus_id = program.Department.campus_id;

  // Find the course based on courseCode and campus_id
  const course = await db.CourseInfo.findOne({
    where: {
      courseCode: params.courseCode,
      campus_id: campus_id, // Ensure the course belongs to the same campus
    },
  });

  if (!course) {
    throw new Error(
      `Course "${params.courseCode}" not found on the same campus as the program "${params.programCode}".`
    );
  }

  // Check if the course is already assigned to the program on the same campus
  const existingProgramCourse = await db.ProgramCourse.findOne({
    where: {
      program_id: program.program_id,
      course_id: course.course_id,
      isDeleted: false,
    },
  });

  if (existingProgramCourse) {
    throw new Error(
      `Course "${params.courseCode}" is already assigned to Program "${params.programCode}" on the same campus.`
    );
  }

  // Create the new program-course association
  const programCourse = new db.ProgramCourse({
    program_id: program.program_id,
    course_id: course.course_id,
    isActive: params.isActive !== undefined ? params.isActive : true, // Default to active if not specified
  });

  // Save the association
  await programCourse.save();

  // Log the creation action
  await db.History.create({
    action: "create",
    entity: "ProgramCourse",
    entityId: programCourse.programCourse_id,
    changes: params,
    adminId: adminId,
  });
}

// Common function to handle the transformation
function transformProgramCourseData(programCourse) {
  return {
    ...programCourse.toJSON(),
    fullProgramDescriptionWithCourseAndCampus:
      `${programCourse.Program.programCode} - ${programCourse.Program.programDescription} - ${programCourse.CourseInfo.courseCode} - ${programCourse.CourseInfo.courseDescription} - ${programCourse.Program.Department.campus.campusName}` ||
      "fullProgramDescriptionWithCourseAndCampus not found",
  };
}

// Helper function to generate include conditions
function getIncludeConditionsForProgramCourse(program_id, campus_id) {
  const includeConditions = [
    {
      model: db.Program,
      where: program_id ? { program_id: program_id } : undefined,
      include: [
        {
          model: db.Department,
          include: [
            {
              model: db.Campus,
              attributes: ["campusName"], // Include only the campus name
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
    includeConditions[0].include[0].where = { campus_id: campus_id };
  }

  return includeConditions;
}

// Reuse the existing getPrograms function



async function getAllProgramAssignCourse(program_id = null, campus_id = null) {
  const whereClause = { isDeleted: false };
  const includeConditions = getIncludeConditionsForProgramCourse(program_id, campus_id);

  const programCourses = await db.ProgramCourse.findAll({
    where: whereClause,
    include: includeConditions,
  });

  return programCourses.map(transformProgramCourseData);
}

async function getProgramAssignCourseCount(program_id = null, campus_id = null) {
  const whereClause = { isActive: true, isDeleted: false };
  const includeConditions = getIncludeConditionsForProgramCourse(program_id, campus_id);

  return await db.ProgramCourse.count({
    where: whereClause,
    include: includeConditions,
  });
}

async function getAllProgramAssignCourseActive(program_id = null, campus_id = null) {
  const whereClause = { isActive: true, isDeleted: false };
  const includeConditions = getIncludeConditionsForProgramCourse(program_id, campus_id);

  const programCourses = await db.ProgramCourse.findAll({
    where: whereClause,
    include: includeConditions,
  });

  return programCourses.map(transformProgramCourseData);
}

async function getAllProgramAssignCourseDeleted(program_id = null, campus_id = null) {
  const whereClause = { isDeleted: true };
  const includeConditions = getIncludeConditionsForProgramCourse(program_id, campus_id);

  const programCourses = await db.ProgramCourse.findAll({
    where: whereClause,
    include: includeConditions,
  });

  return programCourses.map(transformProgramCourseData);
}


async function updateProgramAssignCourse(id, params, adminId) {
  // Fetch the program-course association as a Sequelize instance
  const programCourse = await db.ProgramCourse.findByPk(id, {
    include: [
      {
        model: db.Program,
        include: [
          {
            model: db.Department,
            include: [
              {
                model: db.Campus,
                attributes: ["campusName"], // Include only the campus name
              },
            ],
            attributes: ["departmentName", "departmentCode"], // Include only the department name and code
          },
        ],
        attributes: ["programCode", "programDescription"], // Include only the program code and description
      },
      {
        model: db.CourseInfo,
        attributes: ["courseCode"], // Include only the course code
      },
    ],
  });

  if (!programCourse) throw new Error("Program-Course association not found");

  // Log the original state before update
  const originalData = {...programCourse.dataValues};

  const program = programCourse.Program;
  const campus_id = program.Department.campus_id;

  // Check if the action is only to delete the program-course association
  if (params.isDeleted !== undefined) {
    if (params.isDeleted && programCourse.isActive) {
      throw new Error(
        `You must set the Status of the Program-Course association to Inactive before you can delete it.`
      );
    }

    Object.assign(programCourse, {isDeleted: params.isDeleted});
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
      courseCode: params.courseCode,
      campus_id: campus_id, // Ensure the course belongs to the same campus
    },
  });

  if (!course) {
    throw new Error(
      `Course "${params.courseCode}" not found on the same campus as the program "${program.programCode}".`
    );
  }

  // Check if the course is already assigned to the program on the same campus and it's not the same association being updated
  const existingProgramCourse = await db.ProgramCourse.findOne({
    where: {
      program_id: program.program_id,
      course_id: course.course_id,
      programCourse_id: {[Op.ne]: id},
      isDeleted: false,
    },
  });

  if (existingProgramCourse) {
    throw new Error(
      `Course "${params.courseCode}" is already assigned to Program "${program.programCode}" on the same campus.`
    );
  }

  // Update program-course association with new params
  Object.assign(programCourse, {
    program_id: program.program_id,
    course_id: course.course_id,
    isActive: params.isActive !== undefined ? params.isActive : true, // Default to active if not specified
  });

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
