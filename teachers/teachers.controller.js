const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const teacherService = require("./teacher.service");

router.post("/add-teacher", authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), addTeacherSchema, addTeacher);
router.get("/", authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), getAllTeacher);
router.get("/count", authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), getAllTeacherCount);
router.get("/active",  authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), getAllTeacherActive);
router.get("/deleted", authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), getAllTeacherDeleted);
router.get("/:id",  authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), getTeacherById);
router.put("/:id", authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), updateTeacherSchema, updateTeacher);

module.exports = router;

function addTeacher(req, res, next) {
  teacherService
    .createTeacher(req.body, req.user.id)
    .then(() =>
      res.json({
        message: "Teacher Added Successfully.",
      })
    )
    .catch(next);
}

function getAllTeacher(req, res, next) {
  const campus_id = req.query.campus_id; // Extract campus_id from query parameters
  const campusName = req.query.campusName; // Extract campusName from query parameters
  
  teacherService
    .getAllTeachers(campus_id, campusName) // Pass campus_id and campusName to the service function
    .then((teacher) => res.json(teacher))
    .catch(next);
}

function getAllTeacherCount(req, res, next) {
  const campus_id = req.query.campus_id;
  const campusName = req.query.campusName;

  teacherService
    .getAllTeachersCount(campus_id, campusName)
    .then((teacher) => res.json(teacher))
    .catch(next);
}

function getAllTeacherActive(req, res, next) {
  const campus_id = req.query.campus_id;
  const campusName = req.query.campusName;

  teacherService
    .getAllTeachersActive(campus_id, campusName)
    .then((teacher) => res.json(teacher))
    .catch(next);
}

function getAllTeacherDeleted(req, res, next) {
  const campus_id = req.query.campus_id;
  const campusName = req.query.campusName;
  
  teacherService
  .getAllTeachersDeleted(campus_id, campusName)
  .then((teacher) => res.json(teacher))
  .catch(next);
}

function getTeacherById(req, res, next) {
  const campusName = req.query.campusName;

  teacherService
    .getTeacherById(req.params.id, campusName)
    .then((teacher) => (teacher ? res.json(teacher) : res.sendStatus(404)))
    .catch(next);
}

function updateTeacher(req, res, next) {
  teacherService
    .updateTeacher(req.params.id, req.body, req.user.id)
    .then(() =>
      res.json({
        message: "Teacher Updated Successfully.",
      })
    )
    .catch(next);
}

// ! Schemas
function addTeacherSchema(req, res, next) {
  const schema = Joi.object({
    firstName: Joi.string().required(),
    middleName: Joi.string().required(),
    lastName: Joi.string().required(),
    teacherAddress: Joi.string().required(),
    contactNumber: Joi.string().required(),
    email: Joi.string().email.required(),
    gender: Joi.string().required(),

    // need for validation
    departmentCode: Joi.string().empty(""),
    departmentName: Joi.string().empty(""),

    campus_id: Joi.number().empty(""),
    campusName: Joi.string().empty(""),
  });
  validateRequest(req, next, schema);
}

function updateTeacherSchema(req, res, next) {
  const schema = Joi.object({
    firstName: Joi.string().empty(""),
    middleName: Joi.string().empty(""),
    lastName: Joi.string().empty(""),
    teacherAddress: Joi.string().empty(""),
    contactNumber: Joi.string().empty(""),
    email: Joi.string().email.empty(""),
    gender: Joi.string().empty(""),

    // for validation
    departmentCode: Joi.string().empty(""),
    departmentName: Joi.string().empty(""),
    
    campus_id: Joi.number().empty(""),
    campusName: Joi.string().empty(""),
    
    isActive: Joi.boolean().empty(""),
    isDeleted: Joi.boolean().empty(""),
  });
  validateRequest(req, next, schema);
}
