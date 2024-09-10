const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const buildingStructureService = require("./buildingstructure.service");

router.post("/add-structure", authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), addStructureSchema, addStructure);
router.get('/', authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), getAllStructure);
router.get('/count', authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), getAllStructureCount);
router.get('/active', authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), getAllStructuresActive);
router.get('/deleted', authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), getAllStructuresDeleted);
router.get('/:id', authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), getStructureById);
// router.put("/:id", authorize([Role.SuperAdmin, Role.Admin, Role.Staff]), updateRoomSchema, updateRoom); 


module.exports = router;

function addStructure(req, res, next) {
  buildingStructureService
    .createStructure(req.body, req.user.id)
    .then(() =>
      res.json({
        message:
          "Structure Added Successfully.",
      })
    )
    .catch(next);
}

function getAllStructure(req, res, next) {
  const {campus_id, filterBuilding, filterFloor, filterRoom, buildingName, floorName} = req.query;
  
  buildingStructureService.getAllStructure(campus_id, filterBuilding, filterFloor, filterRoom, buildingName, floorName)
      .then(structure => res.json(structure))
      .catch(next);
}

function getAllStructureCount(req, res, next) {
  const {campus_id, filterBuilding, filterFloor, filterRoom, buildingName, floorName} = req.query;
  
  buildingStructureService.getAllStructureCount(campus_id, filterBuilding, filterFloor, filterRoom, buildingName, floorName)
      .then(structures => res.json(structures))
      .catch(next);
}

function getAllStructuresActive(req, res, next) {
  const {campus_id, filterBuilding, filterFloor, filterRoom, buildingName, floorName} = req.query;
  
  buildingStructureService.getAllStructuresActive(campus_id, filterBuilding, filterFloor, filterRoom, buildingName, floorName)
      .then(structures => res.json(structures))
      .catch(next);
}

function getAllStructuresDeleted(req, res, next) {
  const {campus_id, filterBuilding, filterFloor, filterRoom, buildingName, floorName} = req.query;
  
  buildingStructureService.getAllStructuresDeleted(campus_id, filterBuilding, filterFloor, filterRoom, buildingName, floorName)
      .then(structures => res.json(structures))
      .catch(next);
}


function getStructureById(req, res, next) {
  buildingStructureService.getStructureById(req.params.id)
      .then(structure => structure ? res.json(structure) : res.sendStatus(404))
      .catch(next);
}

function updateRoom(req, res, next) {
  buildingStructureService
    .updateRoom(req.params.id, req.body)
    .then(() =>
      res.json({
        message:
          "Room Updated Successfully.",
      })
    )
    .catch(next);
}

// ! Schemas
function addStructureSchema(req, res, next) {
  const schema = Joi.object({
    isBuilding: Joi.boolean().empty(""),
    isFloor: Joi.boolean().empty(""),
    isRoom: Joi.boolean().empty(""),

    buildingName: Joi.string().empty(""),
    floorName: Joi.string().empty(""),
    roomName: Joi.string().empty(""),
    campus_id: Joi.number().required(),
  }).custom((obj, helpers) => {
    // Check that only one of isBuilding, isFloor, or isRoom is true
    const boolFields = [obj.isBuilding, obj.isFloor, obj.isRoom];
    const trueCount = boolFields.filter(val => val === true).length;

    if (trueCount !== 1) {
      return helpers.message('Only one of "isBuilding", "isFloor", or "isRoom" can be true.');
    }
    
    return obj; // All good
  });

  validateRequest(req, next, schema);
}



function updateRoomSchema(req, res, next) {
  const schema = Joi.object({
    floorLevel: Joi.string().empty(""),
    roomNumber: Joi.string().empty(""),
    building: Joi.string().empty(""),
    isActive: Joi.boolean().empty(""),
    
    isDeleted: Joi.boolean().empty(""),
  });
  validateRequest(req, next, schema);
}
