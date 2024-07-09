const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const roomService = require("./room.service");

router.post("/add-room", authorize(Role.Admin, Role.Staff), addRoomSchema, addRoom);
router.get('/', authorize(Role.Admin, Role.Staff), getAllRoom);
router.get('/:id', authorize(Role.Admin, Role.Staff), getRoomById);
router.put("/:id", updateRoomSchema, updateRoom); 


module.exports = router;

function addRoom(req, res, next) {
  roomService
    .createRoom(req.body)
    .then(() =>
      res.json({
        message:
          "Room Added Successfully.",
      })
    )
    .catch(next);
}

function getAllRoom(req, res, next) {
  roomService.getAllRoom()
      .then(room => res.json(room))
      .catch(next);
}


function getRoomById(req, res, next) {
  departmentService.getDepartmentById(req.params.id)
      .then(room => room ? res.json(room) : res.sendStatus(404))
      .catch(next);
}

function updateRoom(req, res, next) {
  roomService
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
function addRoomSchema(req, res, next) {
  const schema = Joi.object({
    floorLevel: Joi.string().required(),
    roomNumber: Joi.string().required(),
    building: Joi.string().required(),
  });
  validateRequest(req, next, schema);
}


function updateRoomSchema(req, res, next) {
  const schema = Joi.object({
    floorLevel: Joi.string().empty(""),
    roomNumber: Joi.string().empty(""),
    building: Joi.string().empty(""),
    isActive: Joi.boolean().empty(""),
  });
  validateRequest(req, next, schema);
}
