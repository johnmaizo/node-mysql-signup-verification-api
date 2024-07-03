const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const studentService = require("./student.service");

router.post("/add-student", addStudentSchema, addStudent);


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

// ! Schemas
function addStudentSchema(req, res, next) {
  const schema = Joi.object({
    // student_id: Joi.string().required(),
    firstName: Joi.string().required(),
    middleName: [Joi.string().optional(), Joi.allow(null)],
    lastName: Joi.string().required(),
    // email: Joi.string().email().required(),
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
