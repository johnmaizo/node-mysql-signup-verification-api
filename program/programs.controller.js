const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const programService = require("./program.service");

router.post(
  "/add-program",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar]),
  addProgramSchema,
  addProgram
);
router.get(
  "/",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar]),
  getAllProgram
);
router.get(
  "/count",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar]),
  getAllProgramCount
);
router.get(
  "/active",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar]),
  getAllProgramActive
);
router.get(
  "/deleted",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar]),
  getAllProgramDeleted
);
router.get(
  "/get-program",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar]),
  getProgramByProgramCode
);
router.get(
  "/:id",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar]),
  getProgramById
);
router.put(
  "/:id",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar]),
  updateProgramSchema,
  updateProgram
);

module.exports = router;

function addProgram(req, res, next) {
  programService
    .createProgram(req.body, req.user.id)
    .then(() =>
      res.json({
        message: "Program Added Successfully.",
      })
    )
    .catch(next);
}

function getAllProgram(req, res, next) {
  const campus_id = req.query.campus_id; // Extract campus_id from query parameters
  const campusName = req.query.campusName; // Extract campusName from query parameters

  programService
    .getAllPrograms(campus_id, campusName) // Pass campus_id and campusName to the service function
    .then((program) => res.json(program))
    .catch(next);
}

function getAllProgramCount(req, res, next) {
  const campus_id = req.query.campus_id;
  const campusName = req.query.campusName;

  programService
    .getAllProgramsCount(campus_id, campusName)
    .then((program) => res.json(program))
    .catch(next);
}

function getAllProgramActive(req, res, next) {
  const campus_id = req.query.campus_id;
  const campusName = req.query.campusName;

  programService
    .getAllProgramsActive(campus_id, campusName)
    .then((program) => res.json(program))
    .catch(next);
}

function getAllProgramDeleted(req, res, next) {
  const campus_id = req.query.campus_id;
  const campusName = req.query.campusName;

  programService
    .getAllProgramsDeleted(campus_id, campusName)
    .then((program) => res.json(program))
    .catch(next);
}

function getProgramById(req, res, next) {
  const campusName = req.query.campusName;

  programService
    .getProgramById(req.params.id, campusName)
    .then((program) => (program ? res.json(program) : res.sendStatus(404)))
    .catch(next);
}

function getProgramByProgramCode(req, res, next) {
  const campus_id = req.query.campus_id;
  const programCode = req.query.programCode;

  programService
    .getProgramByProgramCode(programCode, campus_id)
    .then((program) => res.json(program))
    .catch(next);
}

function updateProgram(req, res, next) {
  programService
    .updateProgram(req.params.id, req.body, req.user.id)
    .then(() =>
      res.json({
        message: "Program Updated Successfully.",
      })
    )
    .catch(next);
}

// ! Schemas
function addProgramSchema(req, res, next) {
  const schema = Joi.object({
    programCode: Joi.string().required(),
    programDescription: Joi.string().required(),

    departmentCode: Joi.string().empty(""),
    departmentName: Joi.string().empty(""),
    campusName: Joi.string().empty(""),

    campus_id: Joi.number().empty(""),
  });
  validateRequest(req, next, schema);
}

function updateProgramSchema(req, res, next) {
  const schema = Joi.object({
    programCode: Joi.string().empty(""),
    programDescription: Joi.string().empty(""),
    departmentName: Joi.string().empty(""),

    departmentCode: Joi.string().empty(""),
    departmentName: Joi.string().empty(""),

    campus_id: Joi.number().empty(""),
    campusName: Joi.string().empty(""),

    isActive: Joi.boolean().empty(""),
    isDeleted: Joi.boolean().empty(""),
  });
  validateRequest(req, next, schema);
}
