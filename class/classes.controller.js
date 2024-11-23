const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const classService = require("./class.service");

router.get(
  "/active",
  authorize([
    Role.SuperAdmin,
    Role.Admin,
    Role.Registrar,
    Role.MIS,
    Role.Accounting,
  ]),
  getAllClassActive
);

router.get("/external/active", getAllClassActive);

router.get("/external/total-students", getTotalStudents);

// **New Route for Getting Class by ID**
router.get("/:id", getClassById);

module.exports = router;

function getAllClassActive(req, res, next) {
  const {campus_id, schoolYear, semester_id} = req.query;

  classService
    .getAllClass(campus_id, schoolYear, semester_id)
    .then((classes) => res.json(classes))
    .catch(next);
}

function getTotalStudents(req, res, next) {
  const {campus_id, schoolYear, semester_id} = req.query;

  classService
    .getTotalStudents(campus_id, schoolYear, semester_id)
    .then((total) => res.json({totalStudents: total}))
    .catch(next);
}

// **New Function for Handling the Class by ID Request**
function getClassById(req, res, next) {
  const {id} = req.params;

  classService
    .getClassById(id)
    .then((classData) => res.json(classData))
    .catch(next);
}
