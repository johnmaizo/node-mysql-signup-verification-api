const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const scheduleService = require("./schedule.service");

router.post("/add-schedule", authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), addScheduleSchema, addSchedule);
router.get('/', authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), getAllSchedule);
router.get('/:id', authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), getScheduleById);
router.put("/:id", authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), updateScheduleSchema, updateSchedule); 


module.exports = router;

function addSchedule(req, res, next) {
  scheduleService
    .createSchedule(req.body)
    .then(() =>
      res.json({
        message:
          "Schedule Added Successfully.",
      })
    )
    .catch(next);
}

function getAllSchedule(req, res, next) {
  scheduleService.getAllSchedule()
      .then(schedule => res.json(schedule))
      .catch(next);
}


function getScheduleById(req, res, next) {
  scheduleService.getScheduleById(req.params.id)
      .then(schedule => schedule ? res.json(schedule) : res.sendStatus(404))
      .catch(next);
}

function updateSchedule(req, res, next) {
  scheduleService
    .updateSchedule(req.params.id, req.body)
    .then(() =>
      res.json({
        message:
          "Schedule Updated Successfully.",
      })
    )
    .catch(next);
}

// ! Schemas
function addScheduleSchema(req, res, next) {
  const schema = Joi.object({
    classDay: Joi.string().required(),
    classHour: Joi.string().required(),
    staff: Joi.string().required(),
    courseCode: Joi.string().required(),
    // di ko kabalo mo connect sa naka reference na room id
  });
  validateRequest(req, next, schema);
}


function updateScheduleSchema(req, res, next) {
  const schema = Joi.object({
    classDay: Joi.string().empty(""),
    classHour: Joi.string().empty(""),
    staff: Joi.string().required(""),
    courseCode: Joi.string().required(""),
    isActive: Joi.boolean().empty(""),
    
    isDeleted: Joi.boolean().empty(""),
  });
  validateRequest(req, next, schema);
}
