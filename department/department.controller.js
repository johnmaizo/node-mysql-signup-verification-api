const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const departmentService = require("./department.service");
const { getAllDepartment, getPreviousTotalDepartment, updateDepartment } = require("./department.service");

router.post("/add-department", authorize(Role.Admin, Role.Staff), addDepartmentSchema, addDepartment);
router.get('/', authorize(Role.Admin, Role.Staff), getAllDepartment);
router.get('/previous', authorize(Role.Admin, Role.Staff), getPreviousTotalDepartment);
router.get('/:id', authorize(Role.Admin, Role.Staff), getDepartmentById);
router.put("/:id", updateDepartmentSchema, updateDepartment); 


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
      .then(department => res.json(department))
      .catch(next);
}

function getPreviousTotalDepartment(req, res, next) {
  departmentService.getPreviousTotalDepartment()
    .then(previousTotal => res.json({ total: previousTotal }))
    .catch(next);
}

function getDepartmentById(req, res, next) {
  departmentService.getDepartmentById(req.params.id)
      .then(teacher => teacher ? res.json(teacher) : res.sendStatus(404))
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
  });
  validateRequest(req, next, schema);
}


function updateDepartmentSchema(req, res, next) {
  const schema = Joi.object({
    departmentName: Joi.string().empty(""),
  });
  validateRequest(req, next, schema);
}
