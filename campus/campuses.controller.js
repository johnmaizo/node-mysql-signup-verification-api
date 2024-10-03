const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const campusService = require("./campus.service");

router.post(
  "/add-campus",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.DataCenter, Role.MIS]),
  addCampusSchema,
  addCampus
);
router.get(
  "/",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.DataCenter, Role.MIS]),
  getAllCampus
);
router.get(
  "/count",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.DataCenter, Role.MIS]),
  getAllCampusCount
);
router.get(
  "/active",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.DataCenter, Role.MIS]),
  getAllCampusActive
);
router.get(
  "/deleted",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.DataCenter, Role.MIS]),
  getAllCampusDeleted
);
router.get(
  "/:id",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.DataCenter, Role.MIS]),
  getCampusById
);
router.put(
  "/:id",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.DataCenter, Role.MIS]),
  updateCampusSchema,
  updateCampus
);

module.exports = router;

function addCampus(req, res, next) {
  campusService
    .createCampus(req.body, req.user.id)
    .then(() =>
      res.json({
        message: "Campus Added Successfully.",
      })
    )
    .catch(next);
}

function getAllCampus(req, res, next) {
  campusService
    .getAllCampus()
    .then((campuses) => res.json(campuses))
    .catch(next);
}

function getAllCampusActive(req, res, next) {
  campusService
    .getAllCampusActive()
    .then((campuses) => res.json(campuses))
    .catch(next);
}

function getAllCampusDeleted(req, res, next) {
  campusService
    .getAllCampusDeleted()
    .then((campuses) => res.json(campuses))
    .catch(next);
}

function getAllCampusCount(req, res, next) {
  campusService
    .getAllCampusCount()
    .then((campuses) => res.json(campuses))
    .catch(next);
}

function getCampusById(req, res, next) {
  campusService
    .getCampusById(req.params.id)
    .then((campus) => (campus ? res.json(campus) : res.sendStatus(404)))
    .catch(next);
}

function updateCampus(req, res, next) {
  campusService
    .updateCampus(req.params.id, req.body, req.user.id)
    .then(() =>
      res.json({
        message: "Campus Updated Successfully.",
      })
    )
    .catch(next);
}

// ! Schemas
function addCampusSchema(req, res, next) {
  const schema = Joi.object({
    campusName: Joi.string().required(),
    campusAddress: Joi.string().required(),
  });
  validateRequest(req, next, schema);
}

function updateCampusSchema(req, res, next) {
  const schema = Joi.object({
    campusName: Joi.string().empty(""),
    campusAddress: Joi.string().empty(""),
    isActive: Joi.boolean().empty(""),

    isDeleted: Joi.boolean().empty(""),
  });
  validateRequest(req, next, schema);
}
