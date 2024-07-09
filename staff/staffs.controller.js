const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const staffService = require("./staff.service");

router.post("/add-staff", authorize(Role.Admin, Role.Staff), addStaffSchema, addStaff);
router.get('/', authorize(Role.Admin, Role.Staff), getAllStaff);
router.get('/:id', authorize(Role.Admin, Role.Staff), getStaffById);
router.put("/:id", updateStaffSchema, updateStaff); 


module.exports = router;

function addStaff(req, res, next) {
  staffService
    .createStaff(req.body)
    .then(() =>
      res.json({
        message:
          "Staff Added Successfully.",
      })
    )
    .catch(next);
}

function getAllStaff(req, res, next) {
  staffService.getAllStaff()
      .then(staff => res.json(staff))
      .catch(next);
}


function getStaffById(req, res, next) {
  staffService.getStaffById(req.params.id)
      .then(staff => staff ? res.json(staff) : res.sendStatus(404))
      .catch(next);
}

function updateStaff(req, res, next) {
  staffService
    .updateStaff(req.params.id, req.body)
    .then(() =>
      res.json({
        message:
          "Staff Updated Successfully.",
      })
    )
    .catch(next);
}

// ! Schemas
function addStaffSchema(req, res, next) {
  const schema = Joi.object({
    staffRole: Joi.string().required(),
    firstName: Joi.string().required(),
    middleName: Joi.string().required(),
    lastName: Joi.string().required(),
    staffAddress: Joi.string().required(),
    contactNumber: Joi.string().required(),
    email: Joi.string().required(),
  });
  validateRequest(req, next, schema);
}


function updateStaffSchema(req, res, next) {
  const schema = Joi.object({
    staffRole: Joi.string().empty(""),
    firstName: Joi.string().empty(""),
    middleName: Joi.string().empty(""),
    lastName: Joi.string().empty(""),
    staffAddress: Joi.string().empty(""),
    contactNumber: Joi.string().empty(""),
    email: Joi.string().empty(""),
    isActive: Joi.boolean().empty(""),
  });
  validateRequest(req, next, schema);
}
