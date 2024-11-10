const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const semesterService = require("./semester.service");

router.post(
  "/add-semester",
  authorize([
    Role.SuperAdmin,
    Role.Admin,
    Role.Registrar,
    Role.MIS,
    Role.Accounting,
  ]),
  addSemesterSchema,
  addSemester
);
router.get(
  "/",
  authorize([
    Role.SuperAdmin,
    Role.Admin,
    Role.Registrar,
    Role.MIS,
    Role.Accounting,
  ]),
  getAllSemester
);
router.get(
  "/active",
  authorize([
    Role.SuperAdmin,
    Role.Admin,
    Role.Registrar,
    Role.MIS,
    Role.Accounting,
  ]),
  getAllSemesterActive
);
router.get(
  "/deleted",
  authorize([
    Role.SuperAdmin,
    Role.Admin,
    Role.Registrar,
    Role.MIS,
    Role.Accounting,
  ]),
  getAllSemesterDeleted
);
router.get(
  "/:id",
  authorize([
    Role.SuperAdmin,
    Role.Admin,
    Role.Registrar,
    Role.MIS,
    Role.Accounting,
  ]),
  getSemesterById
);
router.put(
  "/:id",
  authorize([
    Role.SuperAdmin,
    Role.Admin,
    Role.Registrar,
    Role.MIS,
    Role.Accounting,
  ]),
  updateSemesterSchema,
  updateSemester
);

module.exports = router;

function addSemester(req, res, next) {
  semesterService
    .createSemester(req.body, req.user.id)
    .then(() =>
      res.json({
        message: "Semester Added Successfully.",
      })
    )
    .catch(next);
}

function getAllSemester(req, res, next) {
  const campus_id = req.query.campus_id;

  semesterService
    .getAllSemester(campus_id)
    .then((semesters) => res.json(semesters))
    .catch(next);
}

function getAllSemesterActive(req, res, next) {
  const campus_id = req.query.campus_id;

  semesterService
    .getAllSemesterActive(campus_id)
    .then((semesters) => res.json(semesters))
    .catch(next);
}

function getAllSemesterDeleted(req, res, next) {
  const campus_id = req.query.campus_id;

  semesterService
    .getAllSemesterDeleted(campus_id)
    .then((semesters) => res.json(semesters))
    .catch(next);
}

function getSemesterById(req, res, next) {
  semesterService
    .getSemesterById(req.params.id)
    .then((semester) => (semester ? res.json(semester) : res.sendStatus(404)))
    .catch(next);
}

function updateSemester(req, res, next) {
  semesterService
    .updateSemester(req.params.id, req.body, req.user.id)
    .then(() =>
      res.json({
        message: "Semester Updated Successfully.",
      })
    )
    .catch(next);
}

// ! Schemas
function addSemesterSchema(req, res, next) {
  const schema = Joi.object({
    schoolYear: Joi.string()
      .pattern(/^\d{4}-\d{4}$/) // Regex to match "YYYY-YYYY"
      .required()
      .custom((value, helpers) => {
        const years = value.split("-");
        const startYear = parseInt(years[0], 10);
        const endYear = parseInt(years[1], 10);

        if (endYear !== startYear + 1) {
          return helpers.message(
            "The end year must be exactly one year after the start year."
          );
        }

        return value;
      }),
    semesterName: Joi.string().required(),

    campus_id: Joi.number().required(),
  });
  validateRequest(req, next, schema);
}

function updateSemesterSchema(req, res, next) {
  const schema = Joi.object({
    schoolYear: Joi.string()
      .pattern(/^\d{4}-\d{4}$/) // Regex to match "YYYY-YYYY"
      .empty("")
      .custom((value, helpers) => {
        if (value) {
          const years = value.split("-");
          const startYear = parseInt(years[0], 10);
          const endYear = parseInt(years[1], 10);

          if (endYear !== startYear + 1) {
            return helpers.message(
              "The end year must be exactly one year after the start year."
            );
          }
        }
        return value;
      }),
    semesterName: Joi.string().empty(""),

    campus_id: Joi.number().empty(""),
    campusName: Joi.string().empty(""),

    isActive: Joi.boolean().empty(""),
    isDeleted: Joi.boolean().empty(""),
  });
  validateRequest(req, next, schema);
}
