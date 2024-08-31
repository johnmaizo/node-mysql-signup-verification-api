const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const courseService = require("./program_course.service");

// router.post("/add-course", authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), addCourseSchema, addCourse);

router.post("/add-course", authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), addCourseSchema, addCourse);
router.get('/', authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), getAllCourse);
router.get('/count', authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), getAllCourseCount);
router.get('/active', authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), getAllCourseActive);
router.get('/deleted', authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), getAllCourseDeleted);
router.get('/:id', authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), getCourseById);
router.put("/:id", authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), updateCourseSchema, updateCourse); 


module.exports = router;

function addCourse(req, res, next) {
  courseService
    .createCourse(req.body)
    .then(() =>
      res.json({
        message:
          "Course Added Successfully.",
      })
    )
    .catch(next);
}

function getAllCourse(req, res, next) {
  courseService.getAllCourse()
      .then(course => res.json(course))
      .catch(next);
}

function getAllCourseCount(req, res, next) {
  courseService.getAllCourseCount()
      .then(course => res.json(course))
      .catch(next);
}

function getAllCourseActive(req, res, next) {
  courseService.getAllCourseActive()
      .then(course => res.json(course))
      .catch(next);
}

function getAllCourseDeleted(req, res, next) {
  courseService.getAllCourseDeleted()
      .then(course => res.json(course))
      .catch(next);
}


function getCourseById(req, res, next) {
  courseService.getCourseById(req.params.id)
      .then(course => course ? res.json(course) : res.sendStatus(404))
      .catch(next);
}

function updateCourse(req, res, next) {
  courseService
    .updateCourse(req.params.id, req.body)
    .then(() =>
      res.json({
        message:
          "Course Updated Successfully.",
      })
    )
    .catch(next);
}

// ! Schemas
function addCourseSchema(req, res, next) {
  const schema = Joi.object({
    subjectCode: Joi.string().required(),
    subjectDescription: Joi.string().required(),
    unit: Joi.number().required(),
    course_id: Joi.number().required(),

    courseCode: Joi.string().required(),
    courseName: Joi.string().required(),
    departmentCode: Joi.string().required(),
    departmentName: Joi.string().required(),
    campusName: Joi.string().required(),

  });
  validateRequest(req, next, schema);
}


function updateCourseSchema(req, res, next) {
  const schema = Joi.object({
    subjectCode: Joi.string().empty(""),
    subjectDescription: Joi.string().empty(""),
    unit: Joi.number().empty(""),
    course_id: Joi.number().empty(""),

    isActive: Joi.boolean().empty(""),
    isDeleted: Joi.boolean().empty(""),

    courseCode: Joi.string().empty(""),
    courseName: Joi.string().empty(""),
    departmentCode: Joi.string().empty(""),
    departmentName: Joi.string().empty(""),
    campusName: Joi.string().empty(""),
  });
  validateRequest(req, next, schema);
}
