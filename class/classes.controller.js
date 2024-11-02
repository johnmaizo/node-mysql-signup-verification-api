const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const classService = require("./class.service");

router.post(
  "/add-class",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.MIS]),
  addClassSchema,
  addClass
);

router.get("/", getAllClass);
router.get(
  "/count",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.MIS]),
  getAllClassCount
);
router.get(
  "/active",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.MIS]),
  getAllClassActive
);
router.get(
  "/deleted",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.MIS]),
  getAllClassDeleted
);
router.get(
  "/:id",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.MIS]),
  getClassById
);
router.put(
  "/:id",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.MIS]),
  updateClassSchema,
  updateClass
);

module.exports = router;

// Modify existing functions to pass the accountId
function addClass(req, res, next) {
  classService
    .createClass(req.body, req.user.id)
    .then(() => res.json({ message: "Class added successfully." }))
    .catch(next);
}

function getAllClass(req, res, next) {
  const {campus_id} = req.query;

  classService
    .getAllClass(campus_id)
    .then((courses) => res.json(courses))
    .catch(next);
}

function getAllClassActive(req, res, next) {
  const {campus_id, program_id} = req.query;

  classService
    .getAllClassActive(campus_id, program_id)
    .then((courses) => res.json(courses))
    .catch(next);
}

function getAllClassDeleted(req, res, next) {
  const campus_id = req.query.campus_id;

  classService
    .getAllClassDeleted(campus_id)
    .then((courses) => res.json(courses))
    .catch(next);
}

function getAllClassCount(req, res, next) {
  const campus_id = req.query.campus_id;

  classService
    .getAllClassCount(campus_id)
    .then((courses) => res.json(courses))
    .catch(next);
}

function getClassById(req, res, next) {
  classService
    .getClassById(req.params.id)
    .then((course) => (course ? res.json(course) : res.sendStatus(404)))
    .catch(next);
}

function updateClass(req, res, next) {
  classService
    .updateClass(req.params.id, req.body, req.user.id) // Pass accountId here
    .then(() => res.json({message: "Course Updated Successfully."}))
    .catch(next);
}

// ! Schemas
// Validation Schema
function addClassSchema(req, res, next) {
  const schema = Joi.object({
    className: Joi.string().required(),
    course_id: Joi.number().required(),
    semester_id: Joi.number().required(),
    employee_id: Joi.number().required(),
    structure_id: Joi.number().required(),
    timeStart: Joi.string()
      .regex(/^([0-1]\d|2[0-3]):([0-5]\d)$/)
      .required()
      .label("Time Start")
      .messages({
        "string.pattern.base": `"Time Start" must be in HH:MM format`,
      }),
    timeEnd: Joi.string()
      .regex(/^([0-1]\d|2[0-3]):([0-5]\d)$/)
      .required()
      .label("Time End")
      .messages({
        "string.pattern.base": `"Time End" must be in HH:MM format`,
      }),
    days: Joi.string().required(),
  });
  validateRequest(req, next, schema);
}

function updateClassSchema(req, res, next) {
  const schema = Joi.object({
    className: Joi.string().empty(""),

    course_id: Joi.number().empty(""),
    semester_id: Joi.number().empty(""),
    employee_id: Joi.number().empty(""),

    schedule: Joi.string().empty(""),
  });
  validateRequest(req, next, schema);
}
