const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const subjectService = require("./subject.service");

// router.post("/add-subject", authorize(Role.Admin, Role.Staff), addSubjectSchema, addSubject);

router.post("/add-subject", authorize(Role.Admin, Role.Staff), addSubjectSchema, addSubject);
router.get('/', getAllSubject);
router.get('/count', authorize(Role.Admin, Role.Staff), getAllSubjectCount);
router.get('/active', authorize(Role.Admin, Role.Staff), getAllSubjectActive);
router.get('/deleted', authorize(Role.Admin, Role.Staff), getAllSubjectDeleted);
router.get('/:id', getSubjectById);
router.put("/:id", authorize(Role.Admin, Role.Staff), updateSubjectSchema, updateSubject); 


module.exports = router;

function addSubject(req, res, next) {
  subjectService
    .createSubject(req.body)
    .then(() =>
      res.json({
        message:
          "Subject Added Successfully.",
      })
    )
    .catch(next);
}

function getAllSubject(req, res, next) {
  subjectService.getAllSubject()
      .then(subject => res.json(subject))
      .catch(next);
}

function getAllSubjectCount(req, res, next) {
  subjectService.getAllSubjectCount()
      .then(subject => res.json(subject))
      .catch(next);
}

function getAllSubjectActive(req, res, next) {
  subjectService.getAllSubjectActive()
      .then(subject => res.json(subject))
      .catch(next);
}

function getAllSubjectDeleted(req, res, next) {
  subjectService.getAllSubjectDeleted()
      .then(subject => res.json(subject))
      .catch(next);
}


function getSubjectById(req, res, next) {
  subjectService.getSubjectById(req.params.id)
      .then(subject => subject ? res.json(subject) : res.sendStatus(404))
      .catch(next);
}

function updateSubject(req, res, next) {
  subjectService
    .updateSubject(req.params.id, req.body)
    .then(() =>
      res.json({
        message:
          "Subject Updated Successfully.",
      })
    )
    .catch(next);
}

// ! Schemas
function addSubjectSchema(req, res, next) {
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


function updateSubjectSchema(req, res, next) {
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
