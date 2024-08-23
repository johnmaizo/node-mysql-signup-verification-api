const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const courseService = require("./course.service");

router.post("/add-course", authorize(Role.Admin, Role.Staff), addCourseSchema, addCourse);
router.get('/', authorize(Role.Admin, Role.Staff), getAllCourse);
router.get('/:id', authorize(Role.Admin, Role.Staff), getCourseById);
router.put("/:id", authorize(Role.Admin, Role.Staff), updateCourseSchema, updateCourse); 


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


function getCourseById(req, res, next) {
  courtService.getCourseById(req.params.id)
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
    courseName: Joi.string().required(),
    courseCode: Joi.string().required(),

    department_id: Joi.number().required(),
  });
  validateRequest(req, next, schema);
}


function updateCourseSchema(req, res, next) {
  const schema = Joi.object({
    courseName: Joi.string().empty(""),
    courseCode: Joi.string().empty(""),
    
    department_id: Joi.number().empty(""),

    isActive: Joi.boolean().empty(""),
    isDeleted: Joi.boolean().empty(""),
  });
  validateRequest(req, next, schema);
}
