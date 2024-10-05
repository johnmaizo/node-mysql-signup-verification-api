const {Op, where, col, fn, literal} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

const deepEqual = require("deep-equal");

module.exports = {
  createCourse,
  getAllCourse,
  getAllCourseActive,
  getAllCourseDeleted,
  getAllCourseCount,
  getCourseById,
  updateCourse,
};

async function createCourse(params, accountId) {
  // Validate if courseCode exists on the same campus_id
  const existingCourseCode = await db.CourseInfo.findOne({
    where: {
      courseCode: params.courseCode,
      campus_id: params.campus_id,
    },
  });

  // Get the campusName based on campus_id
  const campus = await db.Campus.findByPk(params.campus_id);
  if (!campus) {
    throw `Campus with ID "${params.campus_id}" not found.`;
  }

  if (existingCourseCode) {
    throw `Course with code "${params.courseCode}" already exists on campus "${campus.campusName}".`;
  }

  // Create the new course
  const newCourse = await db.CourseInfo.create(params);

  // Log the creation action
  await db.History.create({
    action: "create",
    entity: "Course",
    entityId: newCourse.course_id,
    changes: params,
    accountId: accountId,
  });
}

// Common function to handle the transformation
function transformCourseData(course) {
  return {
    ...course.toJSON(),
    departmentCodeForClass: course.department ? course.department.departmentCode : "CEA",
    fullCourseNameWithCampus:
      `${course.courseCode} - ${course.courseDescription} - ${course.campus.campusName}` ||
      "fullCourseNameWithCampus not found",
    fullCourseName:
      `${course.courseCode} - ${course.courseDescription}` ||
      "fullCourseName not found",
    fullDepartmentNameWithCampus: course.department
      ? `${course.department.departmentCode} - ${course.department.departmentName} - ${course.campus.campusName}`
      : null,
    campusName: course.campus.campusName,
  };
}

// Common function to get courses based on filter conditions
async function getCourses(whereClause, program_id = null) {
  const includeConditions = [
    {
      model: db.Campus,
      attributes: ["campusName"], // Include only the campus name
    },
    {
      model: db.Department,
      attributes: ["departmentCode", "departmentName", "department_id"], // Include department details and ID
    },
  ];

  if (program_id) {
    includeConditions.push({
      model: db.Department,
      required: false, // Allow fetching records even when department is null
      include: [
        {
          model: db.Program,
          where: {program_id: program_id}, // Match the program_id
          attributes: ["programCode", "programDescription", "department_id"], // Include program details
        },
      ],
      attributes: ["department_id"], // Include department_id to match with CourseInfo
    });

    // Modify where clause to fetch courses with either a matching department_id or null
    whereClause[Op.or] = [
      {department_id: {[Op.eq]: col("department.department_id")}}, // Matching department
      {department_id: null}, // Allow department_id to be null
    ];
  }

  const courses = await db.CourseInfo.findAll({
    where: whereClause,
    include: includeConditions,
  });

  return courses.map(transformCourseData);
}

async function getAllCourse(campus_id = null, program_id = null) {
  const whereClause = {isDeleted: false};

  if (campus_id) {
    whereClause.campus_id = campus_id;
  }

  return await getCourses(whereClause, program_id);
}

async function getAllCourseActive(campus_id = null, program_id = null) {
  const whereClause = {isActive: true, isDeleted: false};

  if (campus_id) {
    whereClause.campus_id = campus_id;
  }

  return await getCourses(whereClause, program_id);
}

async function getAllCourseDeleted(campus_id = null, program_id = null) {
  const whereClause = {isDeleted: true};

  if (campus_id) {
    whereClause.campus_id = campus_id;
  }

  return await getCourses(whereClause, program_id);
}

async function getAllCourseCount(campus_id = null) {
  const whereClause = {isActive: true, isDeleted: false};

  if (campus_id) {
    whereClause.campus_id = campus_id;
  }

  return await db.CourseInfo.count({
    where: whereClause,
  });
}

async function getCourseById(id) {
  const course = await db.CourseInfo.findByPk(id, {
    include: [
      {
        model: db.Campus,
        attributes: ["campusName"], // Include only the campus name
      },
      {
        model: db.Department,
        attributes: ["departmentCode", "departmentName"], // Include only department attributes
      },
    ],
  });

  if (!course) throw "Course not found";
  return transformCourseData(course);
}

async function updateCourse(id, params, accountId) {
  // Find the course to be updated
  const course = await db.CourseInfo.findByPk(id);
  if (!course) throw "Course not found";

  // Check if the action is only to delete the course
  if (params.isDeleted !== undefined) {
    if (params.isDeleted && course.isActive) {
      throw new Error(
        `You must set the Status of "${course.courseDescription}" to Inactive before you can delete this course.`
      );
    }

    Object.assign(course, {isDeleted: params.isDeleted});
    await course.save();

    // Log the update action
    await db.History.create({
      action: "update",
      entity: "Course",
      entityId: course.course_id,
      changes: params,
      accountId: accountId,
    });

    return;
  }

  // Log the original state before update
  const originalData = {...course.dataValues};

  // If courseCode or campus_id are not provided, use existing values
  const courseCode = params.courseCode || course.courseCode;
  const campus_id = params.campus_id || course.campus_id;

  // Validate if courseCode exists on the same campus_id for another course
  const existingCourseCode = await db.CourseInfo.findOne({
    where: {
      courseCode: courseCode,
      campus_id: campus_id,
      course_id: {[Op.ne]: id}, // Ensure the course being updated is excluded from this check
    },
  });

  if (existingCourseCode) {
    const campus = await db.Campus.findByPk(campus_id);
    const campusName = campus ? campus.campusName : "Unknown";
    throw `Course Code "${courseCode}" is already registered on campus "${campusName}".`;
  }

  // Update the course with new parameters
  Object.assign(course, params);

  // Save the updated course
  await course.save();

  // Check if there are actual changes
  const hasChanges = !deepEqual(originalData, course.dataValues);

  if (hasChanges) {
    // Log the update action with changes
    const changes = {
      original: originalData,
      updated: params,
    };

    // Log the update action
    await db.History.create({
      action: "update",
      entity: "Course",
      entityId: course.course_id,
      changes: changes,
      accountId: accountId,
    });
  }
}
