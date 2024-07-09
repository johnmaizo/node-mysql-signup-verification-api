const {Op} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

module.exports = {
  getAllCourse,
  createCourse,
  getCourseById,
  updateCourse,
};

async function createCourse(params) {
  const course = new db.Course(params);

  // save course
  await course.save();
}

async function getAllCourse() {
  const course = await db.Course.findAll();

  return course;
}

async function getCourseById(id) {
  const course = await db.Course.findByPk(id);
  if (!course) throw "Course not found";
  return courseBasicDetails;
}

async function updateCourse(id, params) {
  const course = await getCourseById(id);

  if (!course) throw "Course not found";

  Object.assign(course, params);
  await course.save();
}
