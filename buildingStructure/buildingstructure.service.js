const {Op} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

const deepEqual = require("deep-equal");

module.exports = {
  createStructure,
  getAllStructure,
  getAllStructureCount,
  getAllStructuresActive,
  getAllStructuresDeleted,
  getStructureById,
  updateStructure,
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
    }`.trim(),
  };
}

// Common function to get structures based on filter conditions
async function getStructures(whereClause) {
  const structures = await db.BuildingStructure.findAll({
    where: whereClause,
    include: [
      {
        model: db.Campus,
        attributes: ["campusName", "campus_id"], // Include only the campus name
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

  if (buildingName && campus_id) {
    const structure = await db.BuildingStructure.findOne({
      where: {
        buildingName: buildingName,
        campus_id: campus_id,
      },
    });

    if (!structure) {
      throw new Error(
        `Building Name "${buildingName}" has not found on Campus "${campus_id}".`
      );
    }
  }
  if (floorName && buildingName && campus_id) {
    const structure = await db.BuildingStructure.findOne({
      where: {
        buildingName: buildingName,
        floorName: floorName,
        campus_id: campus_id,
      },
    });

    if (!structure) {
      throw new Error(
        `Building Name "${buildingName}" or Floor Name "${floorName}" has not found on Campus "${campus_id}".`
      );
    }
  }

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

async function getAllStructureCount(
  campus_id = null,
  filterBuilding = null,
  filterFloor = null,
  filterRoom = null,
  buildingName = null,
  floorName = null
) {
  const whereClause = {isActive: true, isDeleted: false};

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

  return await db.BuildingStructure.count({
    where: whereClause,
  });
}

async function getAllStructuresActive(
  campus_id = null,
  filterBuilding = null,
  filterFloor = null,
  filterRoom = null,
  buildingName = null,
  floorName = null
) {
  const whereClause = {isActive: true, isDeleted: false};

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

async function getAllStructuresDeleted(
  campus_id = null,
  filterBuilding = null,
  filterFloor = null,
  filterRoom = null,
  buildingName = null,
  floorName = null
) {
  const whereClause = {isDeleted: true};

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

async function getStructureById(id) {
  const structure = await db.BuildingStructure.findByPk(id, {
    include: [
      {
        model: db.Campus,
        attributes: ["campusName", "campus_id"], // Include only the campus name
      },
    ],
  });

  if (!structure) throw new Error("Building Structure not found");

  return transformStructureData(structure);
}

async function updateStructure(id, params, accountId) {
  const structure = await db.BuildingStructure.findByPk(id);

  if (!structure) throw "Structure not found";

  // Check if the action is only to delete the structure
  if (params.isDeleted !== undefined) {
    if (params.isDeleted && structure.isActive) {
      throw new Error(
        `You must set the Status of "${
          structure.isBuilding
            ? structure.buildingName
            : structure.isFloor
            ? structure.floorName
            : structure.roomName
          // structure.buildingName || structure.floorName || structure.roomName
        }" to Inactive before you can delete this ${
          structure.isBuilding
            ? "Building"
            : structure.isFloor
            ? "Floor"
            : "Room"
        }.`
      );
    }

    Object.assign(structure, {isDeleted: params.isDeleted});
    await structure.save();

    // Log the update action
    await db.History.create({
      action: "update",
      entity: structure.isBuilding
        ? "Building"
        : structure.isFloor
        ? "Floor"
        : "Room",
      entityId: structure.structure_id,
      changes: params,
      accountId: accountId,
    });

    return structure;
  }

  // Log the original state before update
  const originalData = {...structure.dataValues};

  // Handle validation based on structure type (Building, Floor, Room)
  if (structure.isBuilding) {
    // Check if building name exists
    const existingBuilding = await db.BuildingStructure.findOne({
      where: {
        buildingName: params.buildingName || structure.buildingName,
        campus_id: structure.campus_id,
        isBuilding: true,
        structure_id: {[Op.ne]: id}, // Exclude the current building from this check
      },
    });

    if (existingBuilding) {
      throw `Building "${params.buildingName}" already exists on campus.`;
    }
  } else if (structure.isFloor) {
    // Validate floor
    const existingFloor = await db.BuildingStructure.findOne({
      where: {
        floorName: params.floorName || structure.floorName,
        buildingName: structure.buildingName,
        campus_id: structure.campus_id,
        isFloor: true,
        structure_id: {[Op.ne]: id}, // Exclude the current floor from this check
      },
    });

    if (existingFloor) {
      throw `Floor "${params.floorName}" already exists in building "${structure.buildingName}".`;
    }
  } else if (structure.isRoom) {
    // Validate room
    const existingRoom = await db.BuildingStructure.findOne({
      where: {
        roomName: params.roomName || structure.roomName,
        floorName: structure.floorName,
        buildingName: structure.buildingName,
        campus_id: structure.campus_id,
        isRoom: true,
        structure_id: {[Op.ne]: id}, // Exclude the current room from this check
      },
    });

    if (existingRoom) {
      throw `Room "${params.roomName}" already exists on floor "${structure.floorName}" in building "${structure.buildingName}".`;
    }
  }

  // Update structure with new params
  Object.assign(structure, params);
  await structure.save();

  // Check if there are actual changes
  const hasChanges = !deepEqual(originalData, structure.dataValues);

  if (hasChanges) {
    // Log the update action with changes
    const changes = {
      original: originalData,
      updated: params,
    };

    // Log the update action
    await db.History.create({
      action: "update",
      entity: structure.isBuilding
        ? "Building"
        : structure.isFloor
        ? "Floor"
        : "Room",
      entityId: structure.structure_id,
      changes: changes,
      accountId: accountId,
    });
  }

  return structure;
}
