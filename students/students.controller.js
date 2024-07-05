const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const studentService = require("./student.service");

router.post("/add-student", authorize(Role.Admin, Role.Staff), addStudentSchema, addStudent);
router.get('/', authorize(Role.Admin, Role.Staff), getAllStudents);
router.get('/:id', authorize(Role.Admin, Role.Staff), getStudentById);


module.exports = router;

function addStudent(req, res, next) {
  studentService
    .createStudent(req.body)
    .then(() =>
      res.json({
        message:
          "Student Added Successfully.",
      })
    )
    .catch(next);
}

function getAllStudents(req, res, next) {
  studentService.getAllStudents()
      .then(students => res.json(students))
      .catch(next);
}

function getStudentById(req, res, next) {
  studentService.getStudentById(req.params.id)
      .then(student => student ? res.json(student) : res.sendStatus(404))
      .catch(next);
}

// ! Schemas
function addStudentSchema(req, res, next) {
  const schema = Joi.object({
    firstName: Joi.string().required(),
    middleName: [Joi.string().optional(), Joi.allow(null)],
    lastName: Joi.string().required(),
    email: Joi.string().email().required(),
    gender: Joi.string().required(),
    civilStatus: Joi.string().required(),
    birthDate: Joi.date().required(),
    birthPlace: Joi.string().required(),
    religion: Joi.string().required(),
    citizenship: Joi.string().required(),
    country: Joi.string().required(),
    ACR: [Joi.string().optional(), Joi.allow(null)],
  });
  validateRequest(req, next, schema);
}
