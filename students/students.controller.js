const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const studentService = require("./student.service");

router.post(
  "/add-student",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.MIS]),
  addStudentSchema,
  addStudent
);
router.get(
  "/",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.MIS]),
  getAllStudents
);
router.get(
  "/active",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.MIS]),
  getAllStudentsActive
);
router.get(
  "/previous",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.MIS]),
  getPreviousTotalStudents
);
router.get(
  "/previous-active",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.MIS]),
  getPreviousTotalStudentsActive
);
router.get(
  "/:id",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.MIS]),
  getStudentById
);
router.put(
  "/:id",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.MIS]),
  updateStudentSchema,
  updateStudent
);

module.exports = router;

function addStudent(req, res, next) {
  studentService
    .createStudent(req.body)
    .then(() =>
      res.json({
        message: "Student Added Successfully.",
      })
    )
    .catch(next);
}

function getAllStudents(req, res, next) {
  studentService
    .getAllStudents()
    .then((students) => res.json(students))
    .catch(next);
}

function getAllStudentsActive(req, res, next) {
  studentService
    .getAllStudentsActive()
    .then((students) => res.json(students))
    .catch(next);
}

function getPreviousTotalStudents(req, res, next) {
  studentService
    .getPreviousTotalStudents()
    .then((previousTotal) => res.json({total: previousTotal}))
    .catch(next);
}

function getPreviousTotalStudentsActive(req, res, next) {
  studentService
    .getPreviousTotalStudentsActive()
    .then((previousTotal) => res.json({total: previousTotal}))
    .catch(next);
}

function getStudentById(req, res, next) {
  studentService
    .getStudentById(req.params.id)
    .then((student) => (student ? res.json(student) : res.sendStatus(404)))
    .catch(next);
}

function updateStudent(req, res, next) {
  studentService
    .updateStudent(req.params.id, req.body)
    .then(() =>
      res.json({
        message: "Student Updated Successfully.",
      })
    )
    .catch(next);
}

// ! Schemas
function addStudentSchema(req, res, next) {
  const schema = Joi.object({
    firstName: Joi.string().required(),
    middleName: [Joi.string().optional(), Joi.allow(null)],
    lastName: Joi.string().required(),

    email: Joi.string().email().required(),
    contactNumber: Joi.string().required(),

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

function updateStudentSchema(req, res, next) {
  const schema = Joi.object({
    firstName: Joi.string().empty(""),
    middleName: [Joi.string().optional(), Joi.allow(null)],
    lastName: Joi.string().empty(""),

    email: Joi.string().email().empty(""),
    contactNumber: Joi.string().empty(""),

    gender: Joi.string().empty(""),
    civilStatus: Joi.string().empty(""),
    birthDate: Joi.date().empty(""),
    birthPlace: Joi.string().empty(""),
    religion: Joi.string().empty(""),
    citizenship: Joi.string().empty(""),
    country: Joi.string().empty(""),
    ACR: [Joi.string().optional(), Joi.allow(null)],

    isActive: Joi.boolean().empty(""),

    isDeleted: Joi.boolean().empty(""),
  });
  validateRequest(req, next, schema);
}
