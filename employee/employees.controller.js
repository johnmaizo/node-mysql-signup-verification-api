const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const employeeService = require("./employee.service");

router.post('/add-employee', createEmployeeSchema, createEmployee);
router.get('/', getAllEmployee);
router.get('/count', getAllEmployeeCount);
router.get('/active', getAllEmployeeActive);
router.get('/deleted', getAllEmployeeDeleted);
router.get('/:id', getEmployeeById);
router.put('/:id', updateEmployeeSchema, updateEmployee);

module.exports = router;

function createEmployee(req, res, next) {
    employeeService
    //   .createEmployee(req.body, req.user.id)
      .createEmployee(req.body)
      .then(() =>
        res.json({
          message: "Employee Added Successfully.",
        })
      )
      .catch(next);
  }


  function getAllEmployee(req, res, next) {
    const {campus_id} = req.query;

    employeeService
      .getAllEmployee(campus_id)
      .then((employees) => res.json(employees))
      .catch(next);
  }


  function getAllEmployeeCount(req, res, next) {
    const {campus_id} = req.query;

    employeeService
      .getAllEmployeeCount(campus_id)
      .then((employees) => res.json(employees))
      .catch(next);
  }

  function getAllEmployeeActive(req, res, next) {
    const {campus_id} = req.query;

    employeeService
      .getAllEmployeeActive(campus_id)
      .then((employees) => res.json(employees))
      .catch(next);
  }

  function getAllEmployeeDeleted(req, res, next) {
    const {campus_id} = req.query;

    employeeService
      .getAllEmployeeDeleted(campus_id)
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
    
    // Check if roles include SuperAdmin
    const requireCampus = Array.isArray(roles)
        ? roles.some(role => [Role.SuperAdmin].includes(role))
        : [Role.SuperAdmin].includes(roles);


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

        campus_id:  requireCampus ? Joi.number().empty("") : Joi.number().required(),
    });

    validateRequest(req, next, schema);
}



function updateEmployeeSchema(req, res, next) {
    const schemaRules = {
        campus_id: Joi.number().empty(''),

        title: Joi.string().empty(''),
        firstName: Joi.string().empty(''),
        middleName: Joi.string().allow(null, '').optional(),
        lastName: Joi.string().empty(''),

        address: Joi.string().empty(''),
        contactNumber: Joi.string().empty(''),
        gender: Joi.string().empty(''),

        role: Joi.alternatives().try(
            Joi.string(),
            Joi.array().items(Joi.string())
        ).empty(''),
    };

    // only admins can update role
    if (req.user.role === Role.Admin) {
        schemaRules.role = Joi.string().empty('');
    }
    validateRequest(req, next, schemaRules);
}

function updateEmployee(req, res, next) {
    // users can update their own account and admins can update any account
    if (Number(req.params.id) !== req.user.id && req.user.role !== Role.Admin) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    employeeService.update(req.params.id, req.body)
        .then(account => res.json(account))
        .catch(next);
}