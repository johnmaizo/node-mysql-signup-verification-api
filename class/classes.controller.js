const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const classService = require("./class.service");

router.get(
  "/active",
//   authorize([
//     Role.SuperAdmin,
//     Role.Admin,
//     Role.Registrar,
//     Role.MIS,
//     Role.Accounting,
//   ]),
  getAllClassActive
);

module.exports = router;

function getAllClassActive(req, res, next) {
  const {campus_id, schoolYear, semester_id} = req.query;

  classService
    .getAllClass(campus_id, schoolYear, semester_id)
    .then((classes) => res.json(classes))
    .catch(next);
}
