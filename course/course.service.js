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
  // Validate if courseCode exists in the same department_id
  const existingCourse = await db.Course.findOne({
    where: {
      courseCode: params.courseCode,
      department_id: params.department_id,
    },
  });

  if (existingCourse) {
    throw `Course Code "${params.courseCode}" is already registered under the same department.`;
  }

  // Get the departmentName based on department_id
  const department = await db.Department.findByPk(params.department_id);
  if (!department) {
    throw `Department with ID "${params.department_id}" not found.`;
  }

  // Assign the departmentName to params
  params.departmentName = department.departmentName;

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

  // If courseCode or department_id are not provided, use existing values
  const courseCode = params.courseCode || course.courseCode;
  const department_id = params.department_id || course.department_id;

  // Validate if courseCode exists in the same department_id for another course
  const existingCourse = await db.Course.findOne({
    where: {
      courseCode: courseCode,
      department_id: department_id,
      course_id: {[Op.ne]: id}, // Ensure the course being updated is excluded from this check
    },
  });

  if (existingCourse) {
    throw `Course Code "${courseCode}" is already registered under the same department.`;
  }

  // If department_id is provided, get the departmentName based on department_id
  if (params.department_id) {
    const department = await db.Department.findByPk(params.department_id);
    if (!department) {
      throw `Department with ID "${params.department_id}" not found.`;
    }
    params.departmentName = department.departmentName;
  }

  // Validation: Ensure isActive is set to false before deleting
  if (params.isDeleted && course.isActive) {
    throw `You must set the Status of "${course.courseName}" to Inactive before you can delete this course.`;
  }

  // Update course with new params
  Object.assign(course, params);
  await course.save();
}
