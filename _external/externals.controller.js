const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const externalService = require("./external.service");

router.get('/get-employee-active', getAllEmployeeActive);

module.exports = router;

function getAllEmployeeActive(req, res, next) {
  const {campus_id, role, forAccounts, departmentCode} = req.query;

  externalService
    .getAllEmployeeActive(campus_id, role, forAccounts, departmentCode)
    .then((employees) => res.json(employees))
    .catch(next);
}