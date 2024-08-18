const {Op} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

module.exports = {
  getAllRoom,
  createRoom,
  getRoomById,
  updateRoom,
};

async function createRoom(params) {
  const room = new db.RoomInfo(params);

  // save department
  await room.save();
}

async function getAllRoom() {
  const room = await db.RoomInfo.findAll();

  return room;
}

async function getRoomById(id) {
  const room = await db.RoomInfo.findByPk(id);
  if (!room) throw "Room not found";
  return room;
}

async function updateRoom(id, params) {
  const room = await getRoomById(id);

  if (!room) throw "Room not found";

  Object.assign(room, params);
  await room.save();
}
