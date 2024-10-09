const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const prospectusService = require("./prospectus.service");

// router.post(
//   "/add-prospectus",
//   authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.DataCenter, Role.MIS]),
//   addProspectusSchema,
//   addProspectus
// );
router.post("/add-prospectus", addProspectusSchema, addProspectus);
router.post(
  "/assign-prospectus-subject",
  authorize([
    Role.SuperAdmin,
    Role.Admin,
    Role.Registrar,
    Role.DataCenter,
    Role.MIS,
  ]),
  addProspectusAssignSubjectSchema,
  addProspectusAssignSubject
);
router.get("/get-all-prospectus", getAllProspectus);
router.get("/get-all-prospectus-subjects", getAllProspectusSubjects);
router.get("/get-all-prospectus/count", getAllProspectusCount);
router.get("/get-all-prospectus/active", getAllProspectusActive);
router.get("/get-all-prospectus/deleted", getAllProspectusDeleted);
router.get("/get-prospectus-by-id/:id", getProspectusById);
router.get("/get-prospectus-subjects-by-id/:id", getProspectusSubjectsById);
router.put("/update-prospectus/:id", updateProspectusSchema, updateProspectus);

module.exports = router;

function addProspectus(req, res, next) {
  prospectusService
    // .createProspectus(req.body, req.user.id)
    .createProspectus(req.body)
    .then(() =>
      res.json({
        message: "Prospectus Added Successfully.",
      })
    )
    .catch(next);
}

function addProspectusAssignSubject(req, res, next) {
  prospectusService
    // .createProspectusAssignSubject(req.body)
    .createProspectusAssignSubject(req.body, req.user.id)
    .then(() =>
      res.json({
        message: "Prospectus assigned Subject successfully.",
      })
    )
    .catch(next);
}

function getAllProspectus(req, res, next) {
  const {campus_id, campusName, program_id, programCode} = req.query;

  prospectusService
    .getAllProspectus(campus_id, campusName, programCode, program_id)
    .then((prospectuses) => res.json(prospectuses))
    .catch(next);
}

function getAllProspectusSubjects(req, res, next) {
  const {campus_id} = req.query;

  prospectusService
    .getAllProspectusSubjects(campus_id)
    .then((prospectuses) => res.json(prospectuses))
    .catch(next);
}

function getAllProspectusActive(req, res, next) {
  const {campus_id} = req.query;

  prospectusService
    .getAllProspectusActive(campus_id)
    .then((prospectuses) => res.json(prospectuses))
    .catch(next);
}

function getAllProspectusDeleted(req, res, next) {
  const {campus_id} = req.query;

  prospectusService
    .getAllProspectusDeleted(campus_id)
    .then((prospectuses) => res.json(prospectuses))
    .catch(next);
}

function getAllProspectusCount(req, res, next) {
  const {campus_id} = req.query;

  prospectusService
    .getAllProspectusCount(campus_id)
    .then((prospectuses) => res.json(prospectuses))
    .catch(next);
}

function getProspectusById(req, res, next) {
  prospectusService
    .getProspectusById(req.params.id)
    .then((prospectus) =>
      prospectus ? res.json(prospectus) : res.sendStatus(404)
    )
    .catch(next);
}

function getProspectusSubjectsById(req, res, next) {
  prospectusService
    .getProspectusSubjectByProspectusId(req.params.id)
    .then((prospectus) =>
      prospectus ? res.json(prospectus) : res.sendStatus(404)
    )
    .catch(next);
}

function updateProspectus(req, res, next) {
  prospectusService
    .updateProspectus(req.params.id, req.body, req.user.id)
    .then(() =>
      res.json({
        message: "Prospectus Updated Successfully.",
      })
    )
    .catch(next);
}

// ! Schemas
function addProspectusSchema(req, res, next) {
  const schema = Joi.object({
    program_id: Joi.number().required(),

    campusName: Joi.string().required(),

    prospectusName: Joi.string().required(),
    prospectusDescription: Joi.string().required(),
  });
  validateRequest(req, next, schema);
}

function addProspectusAssignSubjectSchema(req, res, next) {
  const schema = Joi.alternatives().try(
    Joi.object({
      campus_id: Joi.number().required(),
      prospectus_id: Joi.number().required(),
      yearLevel: Joi.string().required(),
      subjectCode: Joi.array().items(Joi.string()).required(),

      // Validate the preRequisite field as an array of objects with specific structure
      preRequisite: Joi.array()
        .items(
          Joi.object({
            prospectus_subject_code: Joi.string().required(), // Required prospectus subject code
            subjectCode: Joi.array().items(Joi.string()).required(), // Array of prerequisite subject codes
          })
        )
        .allow(null)
        .empty(""), // Allow empty array or null for no prerequisites
    }),
    Joi.array().items(
      Joi.object({
        campus_id: Joi.number().required(),
        prospectus_id: Joi.number().required(),
        yearLevel: Joi.string().required(),
        subjectCode: Joi.array().items(Joi.string()).required(),

        preRequisite: Joi.array()
          .items(
            Joi.object({
              prospectus_subject_code: Joi.string().required(),
              subjectCode: Joi.array().items(Joi.string()).required(),
            })
          )
          .allow(null)
          .empty(""),
      })
    )
  );

  validateRequest(req, next, schema);
}

function updateProspectusSchema(req, res, next) {
  const schema = Joi.object({
    program_id: Joi.number().empty(""),

    campusName: Joi.string().empty(""),

    prospectusName: Joi.string().empty(""),
    prospectusDescription: Joi.string().empty(""),

    isActive: Joi.boolean().empty(""),
    isDeleted: Joi.boolean().empty(""),
  });
  validateRequest(req, next, schema);
}
