const {Op, where} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

module.exports = {
  createCourse,
  getAllCourse,
  getAllCourseActive,
  getAllCourseDeleted,
  getAllCourseCount,
  getCourseById,
  updateCourse,
};

async function createCourse(params, adminId) {
  // Check if courseCode already exists
  const existingCourse = await db.CourseInfo.findOne({
    where: {courseCode: params.courseCode},
  });

  if (existingCourse) {
    throw `Course with code "${params.courseCode}" already exists.`;
  }

  // Create the new course
  const newCourse = await db.CourseInfo.create(params);

  // Log the creation action
  await db.History.create({
    action: "create",
    entity: "Course",
    entityId: newCourse.course_id,
    changes: params,
    adminId: adminId,
  });
}

async function getAllCourse() {
  const CourseInfo = await db.CourseInfo.findAll({
    where: {
      isDeleted: false,
    },
  });

  return CourseInfo;
}

async function getAllCourseActive() {
  const courses = await db.CourseInfo.findAll({
    where: {
      isActive: true,
      isDeleted: false,
    },
  });
  return courses;
}

async function getAllCourseDeleted() {
  const courses = await db.CourseInfo.findAll({
    where: {
      isDeleted: true,
    },
  });
  return courses;
}

async function getAllCourseCount() {
  const courses = await db.CourseInfo.count({
    where: {
      isActive: true,
      isDeleted: false,
    },
  });
  return courses;
}

async function getCourseById(id) {
  const course = await db.CourseInfo.findByPk(id);
  if (!course) throw "Course not found";
  return course;
}

async function updateCourse(id, params, adminId) {
  // Find the course to be updated
  const course = await db.CourseInfo.findByPk(id);
  if (!course) throw "Course not found";

  // Log the original state before update
  const originalData = {...course.dataValues};

  // If the courseCode is being updated, check if the new courseCode already exists
  if (params.courseCode && params.courseCode !== course.courseCode) {
    const existingCourse = await db.CourseInfo.findOne({
      where: {
        courseCode: params.courseCode,
        course_id: {[Op.ne]: id},
      },
    });
    if (existingCourse) {
      throw `Course with code "${params.courseCode}" already exists.`;
    }
  }

  // Update the course with new parameters
  Object.assign(course, params);

  // Save the updated course
  await course.save();

  // Log the update action with changes
  const changes = {
    original: originalData,
    updated: params,
  };

  await db.AdminActivityLog.create({
    actionType: "update",
    entityType: "Course",
    entityId: course.id,
    adminId: adminId,
    changes: changes,
  });
}
