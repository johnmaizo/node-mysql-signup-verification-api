const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const programService = require("./program.service");

router.post("/add-program", authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), addProgramSchema, addProgram);
router.get("/", authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), getAllProgram);
router.get("/count", authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), getAllProgramCount);
router.get("/active",  authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), getAllProgramActive);
router.get("/deleted", authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), getAllProgramDeleted);
router.get("/:id",  authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), getProgramById);
router.put("/:id", authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), updateProgramSchema, updateProgram);

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
  programService
    .getAllPrograms()
    .then((program) => res.json(program))
    .catch(next);
}

function getAllProgramCount(req, res, next) {
  programService
    .getAllProgramsCount()
    .then((program) => res.json(program))
    .catch(next);
}

function getAllProgramActive(req, res, next) {
  programService
    .getAllProgramsActive()
    .then((program) => res.json(program))
    .catch(next);
}

function getAllProgramDeleted(req, res, next) {
  programService
    .getAllProgramsDeleted()
    .then((program) => res.json(program))
    .catch(next);
}

function getProgramById(req, res, next) {
  programService
    .getProgramById(req.params.id)
    .then((program) => (program ? res.json(program) : res.sendStatus(404)))
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
    campusName: Joi.string().empty(""),

    isActive: Joi.boolean().empty(""),
    isDeleted: Joi.boolean().empty(""),
  });
  validateRequest(req, next, schema);
}
