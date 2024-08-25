const {Op} = require("sequelize");
const db = require("_helpers/db");

module.exports = {
  createCourse,
  getAllCourses,
  getAllCoursesActive,
  getAllCoursesDeleted,
  getCourseById,
  updateCourse,
};

async function createCourse(params) {
  let department;

  // Fetch departmentName if department_id is provided
  if (params.department_id) {
    department = await db.Department.findByPk(params.department_id);
    if (!department) {
      throw `Department with ID "${params.department_id}" not found.`;
    }
    params.departmentName = `${department.departmentName} - ${department.campusName}`;
  } else if (params.departmentName) {
    // Split departmentName and campusName from params.departmentName
    let [departmentName, campusName] = params.departmentName.split(" - ");
    departmentName = departmentName.trim();
    campusName = campusName.trim();

    // Fetch department_id based on the split departmentName and campusName
    department = await db.Department.findOne({
      where: {
        departmentName: departmentName,
        campusName: campusName,
      },
    });

    if (!department) {
      throw `Department with name "${departmentName}" not found on the campus "${campusName}".`;
    }

    params.department_id = department.department_id;
  } else {
    throw "Either department_id or departmentName must be provided.";
  }

  // Validate if courseCode exists in the same department
  const existingCourseCode = await db.Course.findOne({
    where: {
      courseCode: params.courseCode,
      department_id: params.department_id,
    },
  });

  if (existingCourseCode) {
    throw `Course Code "${params.courseCode}" is already registered under the department "${department.departmentName}" on the campus "${department.campusName}".`;
  }

  // Validate if courseName exists in the same department
  const existingCourseName = await db.Course.findOne({
    where: {
      courseName: params.courseName,
      department_id: params.department_id,
    },
  });

  if (existingCourseName) {
    throw `Course Name "${params.courseName}" is already registered under the department "${department.departmentName}" on the campus "${department.campusName}".`;
  }

  const course = new db.Course(params);

  // Save course
  await course.save();
}

async function getAllCourses() {
  const courses = await db.Course.findAll({
    where: {
      isDeleted: false,
    },
  });
  return courses;
}

async function getAllCoursesActive() {
  const courses = await db.Course.findAll({
    where: {
      isActive: true,
      isDeleted: false,
    },
  });
  return courses;
}

async function getAllCoursesDeleted() {
  const courses = await db.Course.findAll({
    where: {
      isDeleted: true,
    },
  });
  return courses;
}

async function getCourseById(id) {
  const course = await db.Course.findByPk(id);
  if (!course) throw "Course not found";
  return course;
}

async function updateCourse(id, params) {
  const course = await getCourseById(id);
  if (!course) throw "Course not found";

  let department;

  // Fetch departmentName if department_id is provided
  if (params.department_id) {
    department = await db.Department.findByPk(params.department_id);
    if (!department) {
      throw `Department with ID "${params.department_id}" not found.`;
    }
    params.departmentName = `${department.departmentName} - ${department.campusName}`;
  } else if (params.departmentName) {
    // Split departmentName and campusName from params.departmentName
    let [departmentName, campusName] = params.departmentName.split(" - ");
    departmentName = departmentName.trim();
    campusName = campusName.trim();

    // Fetch department_id based on the split departmentName and campusName
    department = await db.Department.findOne({
      where: {
        departmentName: departmentName,
        campusName: campusName,
      },
    });

    if (!department) {
      throw `Department with name "${departmentName}" not found on the campus "${campusName}".`;
    }

    params.department_id = department.department_id;
  } else {
    params.department_id = course.department_id;
    params.departmentName = course.departmentName;
  }

  // Validate if courseCode exists in the same department for another course
  const existingCourseCode = await db.Course.findOne({
    where: {
      courseCode: params.courseCode || course.courseCode,
      department_id: params.department_id,
      course_id: {[Op.ne]: id}, // Ensure the course being updated is excluded from this check
    },
  });

  if (existingCourseCode) {
    throw `Course Code "${
      params.courseCode || course.courseCode
    }" is already registered under the department "${
      department.departmentName
    }" on the campus "${department.campusName}".`;
  }

  // Validate if courseName exists in the same department for another course
  const existingCourseName = await db.Course.findOne({
    where: {
      courseName: params.courseName || course.courseName,
      department_id: params.department_id,
      course_id: {[Op.ne]: id}, // Ensure the course being updated is excluded from this check
    },
  });

  if (existingCourseName) {
    throw `Course Name "${
      params.courseName || course.courseName
    }" is already registered under the department "${
      department.departmentName
    }" on the campus "${department.campusName}".`;
  }

  // Update course with new params
  Object.assign(course, params);
  await course.save();
}
