const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const programCourseService = require("./program_course.service");

// router.post("/add-course", authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), addProgramAssignCourseSchema, addProgramAssignCourse);

router.post("/assign-program-course", authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), addProgramAssignCourseSchema, addProgramAssignCourse);
router.get('/', authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), getAllProgramAssignCourse);
router.get('/count', authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), getAllProgramAssignCourseCount);
router.get('/active', authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), getAllProgramAssignCourseActive);
router.get('/deleted', authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), getAllProgramAssignCourseDeleted);
// router.get('/:id', authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), getCourseById);
router.put("/:id", authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), updateCourseSchema, updateCourse); 


module.exports = router;

function addProgramAssignCourse(req, res, next) {
  programCourseService
    .createProgramAssignCourse(req.body, req.user.id)
    .then(() =>
      res.json({
        message:
          "Program assigned Course Successfully.",
      })
    )
    .catch(next);
}

function getAllProgramAssignCourse(req, res, next) {
  programCourseService.getAllProgramAssignCourse()
      .then(programcourse => res.json(programcourse))
      .catch(next);
}

function getAllProgramAssignCourseCount(req, res, next) {
  programCourseService.getProgramAssignCourseCount()
      .then(programcourse => res.json(programcourse))
      .catch(next);
}

function getAllProgramAssignCourseActive(req, res, next) {
  programCourseService.getAllProgramAssignCourseActive()
      .then(programcourse => res.json(programcourse))
      .catch(next);
}

function getAllProgramAssignCourseDeleted(req, res, next) {
  programCourseService.getAllProgramAssignCourseDeleted()
      .then(programcourse => res.json(programcourse))
      .catch(next);
}


// function getCourseById(req, res, next) {
//   programCourseService.getCourseById(req.params.id)
//       .then(programcourse => programcourse ? res.json(programcourse) : res.sendStatus(404))
//       .catch(next);
// }

function updateCourse(req, res, next) {
  programCourseService
    .updateProgramAssignCourse(req.params.id, req.body, req.user.id)
    .then(() =>
      res.json({
        message:
          "Program assigned Course Updated Successfully.",
      })
    )
    .catch(next);
}

// ! Schemas
function addProgramAssignCourseSchema(req, res, next) {
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
