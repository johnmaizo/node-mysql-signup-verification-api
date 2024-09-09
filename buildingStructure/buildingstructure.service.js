const {Op} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

module.exports = {
  createStructure,
  getAllStructure,
};

async function createStructure(params, accountId) {
  const campus = await db.Campus.findByPk(params.campus_id);
  if (!campus) {
    throw `Campus with ID "${params.campus_id}" not found.`;
  }

  // Validate if creating a building
  if (params.isBuilding) {
    const existingBuilding = await db.BuildingStructure.findOne({
      where: {
        buildingName: params.buildingName,
        campus_id: params.campus_id,
        isBuilding: true,
      },
    });

    if (existingBuilding) {
      throw `Building "${params.buildingName}" already exists on campus "${campus.campusName}".`;
    }

    const building = new db.BuildingStructure(params);
    await building.save();

    // Log the creation of the building
    await db.History.create({
      action: "create",
      entity: "Building",
      entityId: building.structure_id,
      changes: params,
      accountId: accountId,
    });

    return building;
  }

  // Validate if creating a floor
  if (params.isFloor) {
    const buildingExists = await db.BuildingStructure.findOne({
      where: {
        buildingName: params.buildingName,
        campus_id: params.campus_id,
        isBuilding: true,
      },
    });

    if (!buildingExists) {
      throw `Building "${params.buildingName}" not found".`;
    }

    const floorExists = await db.BuildingStructure.findOne({
      where: {
        floorName: params.floorName,
        buildingName: params.buildingName,
        campus_id: params.campus_id,
        isFloor: true,
      },
    });

    if (floorExists) {
      throw `Floor "${params.floorName}" already exists in building "${params.buildingName}" on campus "${campus.campusName}".`;
    }

    const floor = new db.BuildingStructure(params);
    await floor.save();

    // Log the creation of the floor
    await db.History.create({
      action: "create",
      entity: "Floor",
      entityId: floor.structure_id,
      changes: params,
      accountId: accountId,
    });

    return floor;
  }

  // Validate if creating a room
  if (params.isRoom) {
    const floorExists = await db.BuildingStructure.findOne({
      where: {
        buildingName: params.buildingName,
        floorName: params.floorName,
        campus_id: params.campus_id,
        isFloor: true,
      },
    });

    if (!floorExists) {
      throw `Floor "${params.floorName}" not found in building "${params.buildingName}".`;
    }

    const roomExists = await db.BuildingStructure.findOne({
      where: {
        roomName: params.roomName,
        floorName: params.floorName,
        buildingName: params.buildingName,
        campus_id: params.campus_id,
        isRoom: true,
      },
    });

    if (roomExists) {
      throw `Room "${params.roomName}" already exists on floor "${params.floorName}" in building "${params.buildingName}" on campus "${campus.campusName}".`;
    }

    const room = new db.BuildingStructure(params);
    await room.save();

    // Log the creation of the room
    await db.History.create({
      action: "create",
      entity: "Room",
      entityId: room.structure_id,
      changes: params,
      accountId: accountId,
    });

    return room;
  }

  throw "Invalid structure type. Please specify whether you're creating a building, floor, or room.";
}

// Common function to handle the transformation
function transformStructureData(structure) {
  return {
    ...structure.toJSON(),
    fullStructureDetails: `${
      (structure.buildingName && `${structure.buildingName} `) || ""
    }${(structure.floorName && `- ${structure.floorName} `) || ""}${
      (structure.roomName && `- ${structure.roomName}`) || ""
    }`,
  };
}

// Common function to get structures based on filter conditions
async function getStructures(whereClause) {
  const structures = await db.BuildingStructure.findAll({
    where: whereClause,
    include: [
      {
        model: db.Campus,
        attributes: ["campusName"], // Include only the campus name
      },
    ],
  });

  return structures.map(transformStructureData);
}

async function getAllStructure(
  campus_id = null,
  filterBuilding = null,
  filterFloor = null,
  filterRoom = null,
  buildingName = null,
  floorName = null
) {
  const whereClause = {isDeleted: false};

  // Apply filtering based on the parameters
  if (campus_id) {
    whereClause.campus_id = campus_id;
  }
  if (buildingName) {
    whereClause.buildingName = buildingName;
  }
  if (filterBuilding === "true") {
    whereClause.isBuilding = true;
  } else if (filterFloor === "true") {
    whereClause.isFloor = true;
  } else if (filterRoom === "true") {
    whereClause.isRoom = true;
    if (floorName) {
      whereClause.floorName = floorName;
    }
  }

  return await getStructures(whereClause);
}
