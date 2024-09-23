const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const departmentService = require("./department.service");

router.post(
  "/add-department",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar]),
  addDepartmentSchema,
  addDepartment
);
router.get(
  "/",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar]),
  getAllDepartment
);
router.get(
  "/count",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar]),
  getAllDepartmentCount
);
router.get(
  "/active",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar]),
  getAllDepartmentsActive
);
router.get(
  "/deleted",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar]),
  getAllDepartmentsDeleted
);
router.get(
  "/:id",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar]),
  getDepartmentById
);
router.put(
  "/:id",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar]),
  updateDepartmentSchema,
  updateDepartment
);

module.exports = router;

function addDepartment(req, res, next) {
  departmentService
    .createDepartment(req.body, req.user.id)
    .then(() =>
      res.json({
        message: "Department Added Successfully.",
      })
    )
    .catch(next);
}

function getAllDepartment(req, res, next) {
  const campus_id = req.query.campus_id; // Extract campus_id from query parameters

  departmentService
    .getAllDepartment(campus_id) // Pass campus_id to the service function
    .then((departments) => res.json(departments))
    .catch(next);
}

function getAllDepartmentCount(req, res, next) {
  const campus_id = req.query.campus_id;

  departmentService
    .getAllDepartmentCount(campus_id)
    .then((departments) => res.json(departments))
    .catch(next);
}

function getAllDepartmentsActive(req, res, next) {
  const campus_id = req.query.campus_id;

  departmentService
    .getAllDepartmentsActive(campus_id)
    .then((departments) => res.json(departments))
    .catch(next);
}

function getAllDepartmentsDeleted(req, res, next) {
  const campus_id = req.query.campus_id; // Extract campus_id from query parameters

  departmentService
    .getAllDepartmentsDeleted(campus_id)
    .then((departments) => res.json(departments))
    .catch(next);
}

function getDepartmentById(req, res, next) {
  departmentService
    .getDepartmentById(req.params.id)
    .then((department) =>
      department ? res.json(department) : res.sendStatus(404)
    )
    .catch(next);
}

function updateDepartment(req, res, next) {
  departmentService
    .updateDepartment(req.params.id, req.body, req.user.id)
    .then(() =>
      res.json({
        message: "Department Updated Successfully.",
      })
    )
    .catch(next);
}

// ! Schemas
function addDepartmentSchema(req, res, next) {
  const schema = Joi.object({
    departmentName: Joi.string().required(),
    departmentCode: Joi.string().required(),
    departmentDean: Joi.string().required(),

    campus_id: Joi.number().required(),
  });
  validateRequest(req, next, schema);
}

function updateDepartmentSchema(req, res, next) {
  const schema = Joi.object({
    departmentName: Joi.string().empty(""),
    departmentCode: Joi.string().empty(""),
    departmentDean: Joi.string().empty(""),

    campus_id: Joi.number().empty(""),
    campusName: Joi.string().empty(""),

    isActive: Joi.boolean().empty(""),
    isDeleted: Joi.boolean().empty(""),
  });
  validateRequest(req, next, schema);
}
