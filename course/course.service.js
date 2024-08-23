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
  // Check if params.departmentName is defined and then split
  let departmentName = "";
  let campusName = "";

  if (params.departmentName) {
    [departmentName, campusName] = params.departmentName.split(" - ");
    departmentName = departmentName.trim();
    campusName = campusName.trim();
  }

  // Fetch department_id based on the split departmentName and campusName
  const department = await db.Department.findOne({
    where: {
      departmentName: departmentName,
      campusName: campusName,
    },
  });

  if (!department) {
    throw `Department with name "${departmentName}" not found on the campus "${campusName}".`;
  }

  // Assign the department_id to params
  params.department_id = department.department_id;

  // Validate if courseCode exists in the same department
  const existingCourse = await db.Course.findOne({
    where: {
      courseCode: params.courseCode,
      department_id: params.department_id,
    },
  });

  if (existingCourse) {
    throw `Course Code "${params.courseCode}" is already registered under the department "${departmentName}" on the campus "${campusName}".`;
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

  let departmentName, campusName;

  // Check if params.departmentName is defined and then split
  if (params.departmentName) {
    [departmentName, campusName] = params.departmentName.split(" - ");
    departmentName = departmentName.trim();
    campusName = campusName.trim();
  } else {
    departmentName = course.departmentName;
    campusName = course.campusName;
  }

  // Fetch department_id if departmentName or campusName is provided
  if (departmentName || campusName) {
    const department = await db.Department.findOne({
      where: {
        departmentName: departmentName,
        campusName: campusName,
      },
    });

    if (!department) {
      throw `Department with name "${
        departmentName || course.departmentName
      }" not found on the campus "${campusName || course.campusName}".`;
    }

    params.department_id = department.department_id;
  } else {
    // Retain the current department_id if neither departmentName nor campusName is updated
    params.department_id = course.department_id;
  }

  // Validate if courseCode exists in the same department for another course
  const existingCourse = await db.Course.findOne({
    where: {
      courseCode: params.courseCode || course.courseCode,
      department_id: params.department_id,
      course_id: {[Op.ne]: id}, // Ensure the course being updated is excluded from this check
    },
  });

  if (existingCourse) {
    throw `Course Code "${
      params.courseCode || course.courseCode
    }" is already registered under the department "${
      departmentName || course.departmentName
    }" on the campus "${campusName || course.campusName}".`;
  }

  // Validation: Ensure isActive is set to false before deleting
  if (params.isDeleted && course.isActive) {
    throw `You must set the Status of "${course.courseName}" to Inactive before you can delete this course.`;
  }

  // Update course with new params
  Object.assign(course, params);
  await course.save();
}
