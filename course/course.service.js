const {Op, where} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

const deepEqual = require("deep-equal"); // You may need to install this package

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
      adminId: adminId,
    });

    return;
  }

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
      adminId: adminId,
    });
  }
}
