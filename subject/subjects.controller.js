const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const subjectService = require("./subject.service");

router.post("/add-subject", authorize(Role.Admin, Role.Staff), addSubjectSchema, addSubject);
router.get('/', authorize(Role.Admin, Role.Staff), getAllSubject);
router.get('/:id', authorize(Role.Admin, Role.Staff), getSubjectById);
router.put("/:id", updateSubjectSchema, updateSubject); 


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
    subjectDescription: Joi.string().required(),
    unit: Joi.number().required(),
    // need e connect ang course_id //
  });
  validateRequest(req, next, schema);
}


function updateSubjectSchema(req, res, next) {
  const schema = Joi.object({
    subjectDescription: Joi.string().empty(""),
    unit: Joi.number().empty(""),
    isActive: Joi.boolean().empty(""),
  });
  validateRequest(req, next, schema);
}
