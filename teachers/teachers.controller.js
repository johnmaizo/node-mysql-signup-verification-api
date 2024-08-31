const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const teacherService = require("./teacher.service");

router.post("/add-teacher", authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), addTeacherSchema, addTeacher);
router.get('/', authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), getAllTeachers);
router.get('/previous', authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), getPreviousTotalTeachers);
router.get('/:id', authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), getTeacherById);
router.put("/:id", authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), updateTeacherSchema, updateTeacher); 


module.exports = router;

function addTeacher(req, res, next) {
  teacherService
    .createTeacher(req.body)
    .then(() =>
      res.json({
        message:
          "Teacher Added Successfully.",
      })
    )
    .catch(next);
}

function getAllTeachers(req, res, next) {
  teacherService.getAllTeachers()
      .then(teachers => res.json(teachers))
      .catch(next);
}

function getPreviousTotalTeachers(req, res, next) {
  teacherService.getPreviousTotalTeachers()
    .then(previousTotal => res.json({ total: previousTotal }))
    .catch(next);
}

function getTeacherById(req, res, next) {
  teacherService.getTeacherById(req.params.id)
      .then(teacher => teacher ? res.json(teacher) : res.sendStatus(404))
      .catch(next);
}

function updateTeacher(req, res, next) {
  teacherService
    .updateTeacher(req.params.id, req.body)
    .then(() =>
      res.json({
        message:
          "Teacher Updated Successfully.",
      })
    )
    .catch(next);
}

// ! Schemas
function addTeacherSchema(req, res, next) {
  const schema = Joi.object({
    firstName: Joi.string().required(),
    middleName: [Joi.string().optional(), Joi.allow(null)],
    lastName: Joi.string().required(),
    teacherAddress: Joi.string().required(),
    contactNumber: Joi.string().required(),
    email: Joi.string().email().required(),

    department_id: Joi.number().required(),
  });
  validateRequest(req, next, schema);
}


function updateTeacherSchema(req, res, next) {
  const schema = Joi.object({
    firstName: Joi.string().empty(""),
    middleName: [Joi.string().optional(), Joi.allow(null)],
    lastName: Joi.string().empty(""),
    teacherAddress: Joi.string().empty(""),
    contactNumber: Joi.string().empty(""),
    email: Joi.string().email().empty(""),

    department_id: Joi.number().empty(""),
    
    isActive: Joi.boolean().empty(""),
    
    isDeleted: Joi.boolean().empty(""),
  });
  validateRequest(req, next, schema);
}
