const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const externalService = require("./external.service");

router.get("/get-employee-active", getAllEmployeeActive);
router.get("/get-campus-active", getAllCampusActive);
router.get("/get-department-active", getAllDepartmentsActive);
router.get("/get-programs-active", getAllProgramActive);
router.get("/get-class-active", getAllClassActive);
router.get("/get-subjects-active", getAllCourseActive);

module.exports = router;

function getAllEmployeeActive(req, res, next) {
  const {campus_id, role, forAccounts, departmentCode} = req.query;

  externalService
    .getAllEmployeeActive(campus_id, role, forAccounts, departmentCode)
    .then((employees) => res.json(employees))
    .catch(next);
}

function getAllCampusActive(req, res, next) {
  externalService``
    .getAllCampusActive()
    .then((campuses) => res.json(campuses))
    .catch(next);
}

function getAllDepartmentsActive(req, res, next) {
  const {campus_id, campusName} = req.query;

  externalService
    .getAllDepartmentsActive(campus_id, campusName)
    .then((departments) => res.json(departments))
    .catch(next);
}

function getAllProgramActive(req, res, next) {
  const campus_id = req.query.campus_id;
  const campusName = req.query.campusName;

  externalService
    .getAllProgramsActive(campus_id, campusName)
    .then((program) => res.json(program))
    .catch(next);
}

function getAllClassActive(req, res, next) {
  const {campus_id, campusName} = req.query;

  externalService
    .getAllClassActive(campus_id, campusName)
    .then((courses) => res.json(courses))
    .catch(next);
}

function getAllCourseActive(req, res, next) {
  const {campus_id, program_id, programCode} = req.query;

  externalService
    .getAllCourseActive(campus_id, program_id, programCode)
    .then((courses) => res.json(courses))
    .catch(next);
}
