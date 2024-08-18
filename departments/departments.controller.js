const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const departmentService = require("./department.service");

router.post("/add-department", authorize(Role.Admin, Role.Staff), addDepartmentSchema, addDepartment);
router.get('/', authorize(Role.Admin, Role.Staff), getAllDepartment);
router.get('/active', authorize(Role.Admin, Role.Staff), getAllDepartmentsActive);
router.get('/:id', authorize(Role.Admin, Role.Staff), getDepartmentById);
router.put("/:id", authorize(Role.Admin, Role.Staff), updateDepartmentSchema, updateDepartment); 


module.exports = router;

function addDepartment(req, res, next) {
  departmentService
    .createDepartment(req.body)
    .then(() =>
      res.json({
        message:
          "Department Added Successfully.",
      })
    )
    .catch(next);
}

function getAllDepartment(req, res, next) {
  departmentService.getAllDepartment()
      .then(departments => res.json(departments))
      .catch(next);
}

function getAllDepartmentsActive(req, res, next) {
  departmentService.getAllDepartmentsActive()
      .then(departments => res.json(departments))
      .catch(next);
}


function getDepartmentById(req, res, next) {
  departmentService.getDepartmentById(req.params.id)
      .then(department => department ? res.json(department) : res.sendStatus(404))
      .catch(next);
}

function updateDepartment(req, res, next) {
  departmentService
    .updateDepartment(req.params.id, req.body)
    .then(() =>
      res.json({
        message:
          "Department Updated Successfully.",
      })
    )
    .catch(next);
}

// ! Schemas
function addDepartmentSchema(req, res, next) {
  const schema = Joi.object({
    departmentName: Joi.string().required(),
    departmentCode: Joi.string().required(),
    departmentDean: Joi.string().required()
  });
  validateRequest(req, next, schema);
}


function updateDepartmentSchema(req, res, next) {
  const schema = Joi.object({
    departmentName: Joi.string().empty(""),
    departmentCode: Joi.string().empty(""),
    departmentDean: Joi.string().required(),
    isActive: Joi.boolean().empty(""),
    
    isDeleted: Joi.boolean().empty(""),
  });
  validateRequest(req, next, schema);
}
