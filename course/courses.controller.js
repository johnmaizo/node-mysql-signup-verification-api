const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const courseService = require("./course.service");

router.post("/add-course", authorize(Role.Admin, Role.Staff), addCourseSchema, addCourse);
router.get("/", getAllCourse);
router.get("/count", authorize(Role.Admin, Role.Staff), getAllCourseCount);
router.get("/active", authorize(Role.Admin, Role.Staff), getAllCourseActive);
router.get("/deleted", authorize(Role.Admin, Role.Staff), getAllCourseDeleted);
router.get("/:id", authorize(Role.Admin, Role.Staff), getCourseById);
router.put("/:id", authorize(Role.Admin, Role.Staff), updateCourseSchema, updateCourse);

module.exports = router;

// Modify existing functions to pass the adminId
function addCourse(req, res, next) {
  courseService
    .createCourse(req.body, req.user.id) // Assuming req.user contains the authenticated admin
    .then(() => res.json({message: "Course Added Successfully."}))
    .catch(next);
}

function getAllCourse(req, res, next) {
  courseService
    .getAllCourse()
    .then((courses) => res.json(courses))
    .catch(next);
}

function getAllCourseActive(req, res, next) {
  courseService
    .getAllCourseActive()
    .then((courses) => res.json(courses))
    .catch(next);
}

function getAllCourseDeleted(req, res, next) {
  courseService
    .getAllCourseDeleted()
    .then((courses) => res.json(courses))
    .catch(next);
}

function getAllCourseCount(req, res, next) {
  courseService
    .getAllCourseCount()
    .then((courses) => res.json(courses))
    .catch(next);
}

function getCourseById(req, res, next) {
  courseService
    .getCourseById(req.params.id)
    .then((course) => (course ? res.json(course) : res.sendStatus(404)))
    .catch(next);
}

function updateCourse(req, res, next) {
  courseService
    .updateCourse(req.params.id, req.body, req.user.id) // Pass adminId here
    .then(() => res.json({message: "Course Updated Successfully."}))
    .catch(next);
}

// ! Schemas
function addCourseSchema(req, res, next) {
  const schema = Joi.object({
    courseCode: Joi.string().required(),
    courseDescription: Joi.string().required(),
    unit: Joi.number().required(),
  });
  validateRequest(req, next, schema);
}

function updateCourseSchema(req, res, next) {
  const schema = Joi.object({
    courseCode: Joi.string().empty(""),
    courseDescription: Joi.string().empty(""),
    unit: Joi.number().empty(""),

    isActive: Joi.boolean().empty(""),
    isDeleted: Joi.boolean().empty(""),
  });
  validateRequest(req, next, schema);
}
