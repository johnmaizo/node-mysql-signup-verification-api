const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const programCourseService = require("./program_course.service");

// router.post("/add-course", authorize([Role.SuperAdmin, Role.Admin, Role.Registrar]), addProgramAssignCourseSchema, addProgramAssignCourse);

router.post(
  "/assign-program-course",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar]),
  addProgramAssignCourseSchema,
  addProgramAssignCourse
);
router.get("/", getAllProgramAssignCourse);
router.get(
  "/count",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar]),
  getAllProgramAssignCourseCount
);
router.get(
  "/active",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar]),
  getAllProgramAssignCourseActive
);
router.get(
  "/deleted",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar]),
  getAllProgramAssignCourseDeleted
);
// router.get('/:id', authorize([Role.SuperAdmin, Role.Admin, Role.Registrar]), getCourseById);
router.put(
  "/:id",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar]),
  updateCourseSchema,
  updateCourse
);

module.exports = router;

function addProgramAssignCourse(req, res, next) {
  programCourseService
    .createProgramAssignCourse(req.body, req.user.id)
    .then(() =>
      res.json({
        message: "Program assigned Course Successfully.",
      })
    )
    .catch(next);
}

function getAllProgramAssignCourse(req, res, next) {
  const {programCode, campus_id, program_id, campusName} = req.query;

  programCourseService
    .getAllProgramAssignCourse(programCode, program_id, campus_id, campusName)
    .then((programcourse) => programcourse ? res.json(programcourse) : res.sendStatus(404))
    .catch(next);
}

function getAllProgramAssignCourseCount(req, res, next) {
  const {programCode, campus_id, program_id, campusName} = req.query;

  programCourseService
    .getProgramAssignCourseCount(programCode, program_id, campus_id, campusName)
    .then((programcourse) => res.json(programcourse))
    .catch(next);
}

function getAllProgramAssignCourseActive(req, res, next) {
  const {programCode, campus_id, program_id, campusName} = req.query;

  programCourseService
    .getAllProgramAssignCourseActive(
      programCode,
      program_id,
      campus_id,
      campusName
    )
    .then((programcourse) => res.json(programcourse))
    .catch(next);
}

function getAllProgramAssignCourseDeleted(req, res, next) {
  const {programCode, campus_id, program_id, campusName} = req.query;

  programCourseService
    .getAllProgramAssignCourseDeleted(
      programCode,
      program_id,
      campus_id,
      campusName
    )
    .then((programcourse) => res.json(programcourse))
    .catch(next);
}

// function getCourseById(req, res, next) {
//   programCourseService.getCourseById(req.params.id)
//       .then(programcourse => programcourse ? res.json(programcourse) : res.sendStatus(404))
//       .catch(next);
// }

function updateCourse(req, res, next) {
  programCourseService
    .updateProgramAssignCourse(req.params.id, req.body, req.user.id)
    .then(() =>
      res.json({
        message: "Program assigned Course Updated Successfully.",
      })
    )
    .catch(next);
}

// ! Schemas
function addProgramAssignCourseSchema(req, res, next) {
  const schema = Joi.object({
    campus_id: Joi.number().required(),
    programCode: Joi.string().required(),
    courseCode: Joi.alternatives()
      .try(Joi.string(), Joi.array().items(Joi.string()))
      .required(),
  });
  validateRequest(req, next, schema);
}

function updateCourseSchema(req, res, next) {
  const schema = Joi.object({
    campus_id: Joi.number().empty(""),

    courseCode: Joi.string().empty(""),

    isActive: Joi.boolean().empty(""),
    isDeleted: Joi.boolean().empty(""),
  });
  validateRequest(req, next, schema);
}
