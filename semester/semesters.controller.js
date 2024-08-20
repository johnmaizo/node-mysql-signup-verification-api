const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const semesterService = require("./semester.service");

router.post("/add-semester", authorize(Role.Admin, Role.Staff), addSemesterSchema, addSemester);
router.get("/", authorize(Role.Admin, Role.Staff), getAllSemester);
router.get("/active", authorize(Role.Admin, Role.Staff), getAllSemesterActive);
router.get("/deleted", authorize(Role.Admin, Role.Staff), getAllSemesterDeleted);
router.get("/:id", authorize(Role.Admin, Role.Staff), getSemesterById);
router.put("/:id", authorize(Role.Admin, Role.Staff), updateSemesterSchema, updateSemester);

module.exports = router;

function addSemester(req, res, next) {
  semesterService
    .createSemester(req.body)
    .then(() =>
      res.json({
        message: "Semester Added Successfully.",
      })
    )
    .catch(next);
}

function getAllSemester(req, res, next) {
  semesterService
    .getAllSemester()
    .then((semesters) => res.json(semesters))
    .catch(next);
}

function getAllSemesterActive(req, res, next) {
  semesterService
    .getAllSemesterActive()
    .then((semesters) => res.json(semesters))
    .catch(next);
}

function getAllSemesterDeleted(req, res, next) {
  semesterService
    .getAllSemesterDeleted()
    .then((semesters) => res.json(semesters))
    .catch(next);
}

function getSemesterById(req, res, next) {
  semesterService
    .getSemesterById(req.params.id)
    .then((Semester) => (Semester ? res.json(Semester) : res.sendStatus(404)))
    .catch(next);
}

function updateSemester(req, res, next) {
  semesterService
    .updateSemester(req.params.id, req.body)
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
    isActive: Joi.boolean().empty(""),
    isDeleted: Joi.boolean().empty(""),
  });
  validateRequest(req, next, schema);
}
