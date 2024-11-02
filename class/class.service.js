const {Op, where, col, fn, literal} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

const deepEqual = require("deep-equal");

module.exports = {
  createClass,
  getAllClass,
  getAllClassActive,
  getAllClassDeleted,
  getAllClassCount,
  getClassById,
  updateClass,
};

// async function createClass(params) {
async function createClass(params, accountId) {
  // Check if a class with the same name already exists
  const existingClass = await db.Class.findOne({
    where: {className: params.className},
  });

  if (existingClass) {
    throw `Class with the name "${params.className}" already exists.`;
  }

  // Fetch course, semester, employee, and room data
  const course = await db.CourseInfo.findByPk(params.course_id);
  if (!course) {
    throw `Course with ID "${params.course_id}" not found.`;
  }

  const semester = await db.Semester.findByPk(params.semester_id);
  if (!semester) {
    throw `Semester with ID "${params.semester_id}" not found.`;
  }

  // Add validation to check if the semester is active
  if (!semester.isActive) {
    throw `The semester with ID "${params.semester_id}" is not active. Please select an active semester.`;
  }

  const employee = await db.Employee.findByPk(params.employee_id);
  if (!employee) {
    throw `Employee with ID "${params.employee_id}" not found.`;
  }

  const room = await db.BuildingStructure.findByPk(params.structure_id);
  if (!room) {
    throw `Room with ID "${params.structure_id}" not found.`;
  }

  // Additional validations as needed...

  // Validate timeStart and timeEnd
  if (params.timeEnd <= params.timeStart) {
    throw "Time End must be after Time Start.";
  }

  // Validate timeStart and timeEnd
  if (params.timeEnd <= params.timeStart) {
    throw "Time End must be after Time Start.";
  }

  const potentialConflicts = await db.Class.findAll({
    where: {
      structure_id: params.structure_id,
      isDeleted: false,
      timeStart: {
        [Op.lt]: params.timeEnd,
      },
      timeEnd: {
        [Op.gt]: params.timeStart,
      },
    },
  });

  const isOverlap = potentialConflicts.some((cls) => {
    const classDays = cls.days || [];
    return classDays.some((day) => params.days.includes(day));
  });

  if (isOverlap) {
    throw `The room is already booked at the specified time and days.`;
  }

  // Check for overlapping classes for the same instructor
  const overlappingInstructorClasses = await db.Class.findOne({
    where: {
      employee_id: params.employee_id,
      isDeleted: false,
      days: {
        [Op.overlap]: params.days,
      },
      timeStart: {
        [Op.lt]: params.timeEnd,
      },
      timeEnd: {
        [Op.gt]: params.timeStart,
      },
    },
  });

  if (overlappingInstructorClasses) {
    throw `Instructor is already assigned to another class at the specified time and days.`;
  }

  // Create the new class if all validations pass
  const newClass = await db.Class.create(params);

  // Log the creation action
  await db.History.create({
    action: "create",
    entity: "Class",
    entityId: newClass.class_id,
    changes: params,
    accountId: accountId,
  });
}

function transformClassData(cls) {
  let roles = cls.employee.role
    ? cls.employee.role.split(",").map((r) => r.trim())
    : [];

  const validRoles = [
    Role.SuperAdmin,
    Role.Admin,
    Role.MIS,
    Role.Registrar,
    Role.DataCenter,
    Role.Dean,
    Role.Accounting,
  ];

  // Filter roles to keep only valid ones
  const forValidRoles = roles.filter((role) => validRoles.includes(role));

  // Get the first valid role if available
  const firstValidRole = roles.length > 0 ? roles[0] : null;

  // Handle qualifications, parse the string into an array if needed
  let qualificationsArray = [];
  if (typeof cls.employee.qualifications === "string") {
    try {
      qualificationsArray = JSON.parse(cls.employee.qualifications);
    } catch (error) {
      console.error("Error parsing qualifications:", error);
      qualificationsArray = []; // Handle the error by returning an empty array
    }
  } else if (Array.isArray(cls.employee.qualifications)) {
    qualificationsArray = cls.employee.qualifications;
  }

  // Check if qualifications exist and map the abbreviations
  const qualifications =
    qualificationsArray.length > 0
      ? `, (${qualificationsArray.map((q) => q.abbreviation).join(", ")})`
      : "";

  // Convert timeStart and timeEnd to readable format
  const formatTime = (time) => {
    if (!time) return "";
    const [hour, minute] = time.split(":");
    let hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? "PM" : "AM";
    hourNum = hourNum % 12 || 12;
    return `${hourNum}:${minute} ${ampm}`;
  };

  const timeStartFormatted = formatTime(cls.timeStart);
  const timeEndFormatted = formatTime(cls.timeEnd);

  const schedule = `${cls.days.join(
    ", "
  )} - ${timeStartFormatted} to ${timeEndFormatted}`;

  return {
    ...cls.toJSON(),
    instructureFullName:
      `${cls.employee.title} ${cls.employee.firstName}${
        cls.employee.middleName != null
          ? ` ${`${cls.employee.middleName[0]}.`}`
          : ""
      } ${cls.employee.lastName}${qualifications}` || null,
    instructureFullNameWithRole:
      `${cls.employee.title} ${cls.employee.firstName}${
        cls.employee.middleName != null
          ? ` ${`${cls.employee.middleName[0]}.`}`
          : ""
      } ${cls.employee.lastName}${qualifications} - ${
        firstValidRole ? firstValidRole : forValidRoles
      }` || null,
    instructorName:
      `${cls.employee.firstName}${
        cls.employee.middleName != null
          ? ` ${`${cls.employee.middleName[0]}.`}`
          : ""
      } ${cls.employee.lastName}` || null,
    semester_id: cls.semester_id,
    schoolYear: cls.semester.schoolYear,
    semesterName: cls.semester.semesterName,
    campusName: cls.semester.campus.campusName,
    subjectCode: cls.courseinfo.courseCode,
    subjectDescription: cls.courseinfo.courseDescription,
    schedule: schedule,
  };
}

// Common function to get classes based on filter conditions
async function getClasses(whereClause, campus_id = null, schoolYear = null) {
  const includeConditions = [
    {
      model: db.Employee,
      attributes: [
        "title",
        "firstName",
        "middleName",
        "lastName",
        "role",
        "qualifications",
      ],
    },
    {
      model: db.Semester,
      attributes: ["schoolYear", "semesterName"],
      include: [{model: db.Campus, attributes: ["campusName"]}],
      where: {},
    },
  ];

  if (schoolYear) {
    includeConditions[1].where.schoolYear = schoolYear;
  }

  if (campus_id) {
    includeConditions.push({
      model: db.CourseInfo,
      where: {campus_id: campus_id},
      attributes: ["courseCode", "courseDescription"],
    });
  } else {
    includeConditions.push({
      model: db.CourseInfo,
      attributes: ["courseCode", "courseDescription"],
    });
  }

  const classes = await db.Class.findAll({
    where: whereClause,
    include: includeConditions,
  });

  return classes.map(transformClassData);
}

async function getAllClass(
  campus_id = null,
  schoolYear = null,
  semester_id = null
) {
  const whereClause = {isDeleted: false};

  if (semester_id) {
    whereClause.semester_id = semester_id;
  }

  return await getClasses(whereClause, campus_id, schoolYear);
}

async function getAllClassActive(campus_id = null, program_id = null) {
  const whereClause = {isActive: true, isDeleted: false};

  if (campus_id) {
    whereClause.campus_id = campus_id;
  }

  return await getCourses(whereClause, program_id);
}

async function getAllClassDeleted(campus_id = null, program_id = null) {
  const whereClause = {isDeleted: true};

  if (campus_id) {
    whereClause.campus_id = campus_id;
  }

  return await getCourses(whereClause, program_id);
}

async function getAllClassCount(campus_id = null) {
  const whereClause = {isActive: true, isDeleted: false};

  if (campus_id) {
    whereClause.campus_id = campus_id;
  }

  return await db.CourseInfo.count({
    where: whereClause,
  });
}

async function getClassById(id) {
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

async function updateClass(id, params, accountId) {
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
