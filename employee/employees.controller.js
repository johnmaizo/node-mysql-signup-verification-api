const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const employeeService = require("./employee.service");

router.post('/add-employee', authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.DataCenter]), createEmployeeSchema, createEmployee);
router.get('/', getAllEmployee);
router.get('/count', authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.DataCenter]), getAllEmployeeCount);
router.get('/active', authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.DataCenter]), getAllEmployeeActive);
router.get('/deleted', authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.DataCenter]), getAllEmployeeDeleted);
router.get('/:id', authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.DataCenter]), getEmployeeById);
router.put('/:id', authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.DataCenter]), updateEmployeeSchema, updateEmployee);

module.exports = router;

function createEmployee(req, res, next) {
    employeeService
      .createEmployee(req.body, req.user.id)
      .then(() =>
        res.json({
          message: "Employee Added Successfully.",
        })
      )
      .catch(next);
  }


  function getAllEmployee(req, res, next) {
    const {campus_id, role, forAccounts, departmentCode} = req.query;

    employeeService
      .getAllEmployee(campus_id, role, forAccounts, departmentCode)
      .then((employees) => res.json(employees))
      .catch(next);
  }


  function getAllEmployeeCount(req, res, next) {
    const {campus_id, role, forAccounts, departmentCode} = req.query;

    employeeService
      .getAllEmployeeCount(campus_id, role, forAccounts, departmentCode)
      .then((employees) => res.json(employees))
      .catch(next);
  }

  function getAllEmployeeActive(req, res, next) {
    const {campus_id, role, forAccounts, departmentCode} = req.query;

    employeeService
      .getAllEmployeeActive(campus_id, role, forAccounts, departmentCode)
      .then((employees) => res.json(employees))
      .catch(next);
  }

  function getAllEmployeeDeleted(req, res, next) {
    const {campus_id, role, forAccounts, departmentCode} = req.query;

    employeeService
      .getAllEmployeeDeleted(campus_id, role, forAccounts, departmentCode)
      .then((employees) => res.json(employees))
      .catch(next);
  }


  function getEmployeeById(req, res, next) {
    employeeService
      .getEmployeeById(req.params.id)
      .then((employee) => (employee ? res.json(employee) : res.sendStatus(404)))
      .catch(next);
  }

  

function createEmployeeSchema(req, res, next) {
    const roles = req.body.role;
    
    // Check if roles include SuperAdmin for campus requirement
    const requireCampus = Array.isArray(roles)
        ? roles.some(role => [Role.SuperAdmin].includes(role))
        : [Role.SuperAdmin].includes(roles);

    // Check if roles include Instructor, Teacher, or Dean for department requirement
    const requireDepartment = Array.isArray(roles)
        ? roles.some(role => [Role.Instructor, Role.Teacher, Role.Dean].includes(role))
        : [Role.Instructor, Role.Teacher, Role.Dean].includes(roles);

    const schema = Joi.object({
        role: Joi.alternatives().try(
            Joi.string(),
            Joi.array().items(Joi.string())
        ).required(),

        title: Joi.string().required(),
        firstName: Joi.string().required(),
        middleName: Joi.string().allow(null, '').optional(),
        lastName: Joi.string().required(),
        
        gender: Joi.string().required(),
        address: Joi.string().required(),
        contactNumber: Joi.string().required(),

        campus_id: requireCampus ? Joi.number().empty("") : Joi.number().required(),
        
        department_id: requireDepartment ? Joi.number().required() : Joi.optional().allow(null),

        qualifications: Joi.array().items(
            Joi.object({
                abbreviation: Joi.string().required(),
                meaning: Joi.string().required(),
            })
        ).optional().allow(null), // Allow null or an empty array for employees without qualifications
    });

    validateRequest(req, next, schema);
}



function updateEmployeeSchema(req, res, next) {
  const roles = req.body.role;

  // Check if roles include SuperAdmin for campus requirement
  const requireCampus = Array.isArray(roles)
      ? roles.some(role => [Role.SuperAdmin].includes(role))
      : [Role.SuperAdmin].includes(roles);

  // Check if roles include Instructor, Teacher, or Dean for department requirement
  const requireDepartment = Array.isArray(roles)
      ? roles.some(role => [Role.Instructor, Role.Teacher, Role.Dean].includes(role))
      : [Role.Instructor, Role.Teacher, Role.Dean].includes(roles);

  const schema = Joi.object({
      role: Joi.alternatives().try(
          Joi.string(),
          Joi.array().items(Joi.string())
      ).optional(),

      title: Joi.string().optional(),
      firstName: Joi.string().optional(),
      middleName: Joi.string().allow(null, '').optional(),
      lastName: Joi.string().optional(),
      
      gender: Joi.string().optional(),
      address: Joi.string().optional(),
      contactNumber: Joi.string().optional(),

      campus_id: requireCampus ? Joi.number().empty("") : Joi.number().optional(),
      
      department_id: requireDepartment ? Joi.number().empty("") : Joi.number().optional(),

      qualifications: Joi.array().items(
          Joi.object({
              abbreviation: Joi.string().required(),
              meaning: Joi.string().required(),
          })
      ).optional().allow(null), // Allow null or an empty array for employees without qualifications
  });

  validateRequest(req, next, schema);
}

function updateEmployee(req, res, next) {
    employeeService
      .updateEmployee(req.params.id, req.body, req.user.id)
      .then(() =>
        res.json({
          message: "Employee Updated Successfully.",
        })
      )
      .catch(next);
  }