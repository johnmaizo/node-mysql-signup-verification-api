const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const enrollmentService = require("./enrollment.service");

// router.post("/enroll-student", authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), enrollStudentSchema, enrollStudent);
// router.post("/enroll-student", authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), enrollStudent);
router.post("/enroll-student", authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), enrollStudent);
router.get('/', authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), getAllStudentsOfficial);
router.get('/count', authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), getAllStudentOfficialCount);
router.get('/get-chart-data', getChartData);
router.get('/active', authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), getAllStudentsOfficialActive);
router.get('/:id', authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), getStudentById);
router.put("/:id", authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), updateStudentSchema, updateStudent); 


module.exports = router;

function enrollStudent(req, res, next) {
  enrollmentService
    .enrollStudent(req.body, req.user.id)
    // .then((message) => res.json(message))
    // .catch((error) => next(error));

    .then(() =>
        res.json({
          message: "Student Enrolled Successfully!",
        })
      )
    .catch((error) => {
      console.error("Error response:", error.response ? error.response.data : error.message);
      next(error);
    });
}

function getAllStudentsOfficial(req, res, next) {
  const { campusName } = req.query;
  enrollmentService.getAllStudentsOfficial(campusName)
      .then(students => res.json(students))
      .catch(next);
}

function getAllStudentOfficialCount(req, res, next) {
  const { campusName } = req.query;
  
  enrollmentService.getAllStudentOfficialCount(campusName)
      .then(count => res.json(count))
      .catch(next);
}


function getChartData(req, res, next) {
  const { campusName } = req.query;
  
  enrollmentService.getChartData(campusName)
      .then(count => res.json(count))
      .catch(next);
}

function getAllStudentsOfficialActive(req, res, next) {
  enrollmentService.getAllStudentsOfficialActive()
      .then(students => res.json(students))
      .catch(next);
}

function getStudentById(req, res, next) {
  enrollmentService.getStudentById(req.params.id)
      .then(student => student ? res.json(student) : res.sendStatus(404))
      .catch(next);
}

function updateStudent(req, res, next) {
  enrollmentService
    .updateStudent(req.params.id, req.body)
    .then(() =>
      res.json({
        message:
          "Student Updated Successfully.",
      })
    )
    .catch(next);
}

// ! Schemas
function enrollStudentSchema(req, res, next) {
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
    
    isActive: Joi.boolean().empty(''),
    
    isDeleted: Joi.boolean().empty(""),
  });
  validateRequest(req, next, schema);
}
