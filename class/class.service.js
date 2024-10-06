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

  // Fetch course, semester, and employee data
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

  // Validate campus consistency
  if (course.campus_id !== semester.campus_id) {
    throw `Course with ID "${params.course_id}" is not offered in the same campus as the semester with ID "${params.semester_id}".`;
  }

  if (employee.campus_id && employee.campus_id !== course.campus_id) {
    throw `Employee with ID "${params.employee_id}" is not assigned to the same campus as the course with ID "${params.course_id}".`;
  }

  // Ensure that the employee's role is valid for creating a class (not a SuperAdmin or other restricted roles)
  if (
    employee.role === "SuperAdmin" ||
    employee.role === "Admin" ||
    employee.role === "Registrar" ||
    employee.role === "DataCenter" ||
    employee.role === "MIS" ||
    employee.role === "Dean" ||
    employee.role === "Accounting"
  ) {
    throw `Employee with ID "${params.employee_id}" cannot be assigned to a class due to their role (${employee.role}).`;
  }

  // Ensure that the employee's role includes "Instructor"
  //   const employeeRoles = employee.role.split(",").map((role) => role.trim());
  const employeeRoles = employee.role.includes(",")
    ? employee.role.split(",").map((role) => role.trim())
    : [employee.role.trim()];

  if (
    !employeeRoles.includes("Instructor") &&
    !employeeRoles.includes("Teacher") &&
    !employeeRoles.includes("Professor")
  ) {
    throw `Employee with ID "${params.employee_id}" does not have the 'Instructor', 'Teacher', or 'Professor' role and cannot create a class.`;
  }

  // Check if the course's department is part of the same campus (if applicable)
  const department = await db.Department.findByPk(course.department_id);
  if (department && department.campus_id !== course.campus_id) {
    throw `The course's department is not part of the same campus.`;
  }

  // Check department rules
  if (!course.department_id) {
    // If course.department_id is null, employee must belong to a department with departmentCode "CEA"
    const employeeDepartment = await db.Department.findByPk(
      employee.department_id
    );

    if (!employeeDepartment || employeeDepartment.departmentCode !== "CEA") {
      throw `Employee with ID "${params.employee_id}" must belong to the department with code "CEA" when the course has no department.`;
    }
  } else {
    // If course has a department, check if departmentCodes match between course and employee
    const courseDepartment = await db.Department.findByPk(course.department_id);
    const employeeDepartment = await db.Department.findByPk(
      employee.department_id
    );

    if (
      !courseDepartment ||
      !employeeDepartment ||
      courseDepartment.departmentCode !== employeeDepartment.departmentCode
    ) {
      throw `The department code of the course does not match the department code of the employee.`;
    }
  }

  // Create the new class if all validations pass
  const newClass = await db.Class.create(params);
  //   return newClass;

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
    schoolYear: cls.semester.schoolYear,
    semesterName: cls.semester.semesterName,
    campusName: cls.semester.campus.campusName,
    subjectCode: cls.courseinfo.courseCode,
    subjectDescription: cls.courseinfo.courseDescription,
    schedule: cls.schedule,
  };
}

// Common function to get classes based on filter conditions
async function getClasses(whereClause, campus_id = null) {
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
    },
  ];

  if (campus_id) {
    includeConditions.push({
      model: db.CourseInfo,
      where: {campus_id: campus_id},
      attributes: ["courseCode", "courseDescription"], // Include course details
    });
  } else {
    includeConditions.push({
      model: db.CourseInfo,
      attributes: ["courseCode", "courseDescription"], // Include course details
    });
  }

  const classes = await db.Class.findAll({
    where: whereClause,
    include: includeConditions,
  });

  return classes.map(transformClassData);
}

async function getAllClass(campus_id = null) {
  const whereClause = {isDeleted: false};
  return await getClasses(whereClause, campus_id);
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
