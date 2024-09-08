const {DataTypes} = require("sequelize");

module.exports = model;

function model(sequelize) {
  const attributes = {
    structure_id: {
      // Updated primary key name
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    campus_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "campuses",
        key: "campus_id",
      },
      allowNull: false, // Must belong to a campus
    },

    lot: {type: DataTypes.STRING(25), allowNull: true}, // For future use
    buildingName: {type: DataTypes.STRING(25), allowNull: true}, // Nullable if only creating a floor or room

    floorName: {type: DataTypes.STRING(25), allowNull: true}, // Nullable if only creating a building or room

    roomName: {type: DataTypes.STRING(25), allowNull: true}, // Nullable if only creating a building or floor

    // Boolean fields to indicate if it's a building, floor, or room
    isBuilding: {type: DataTypes.BOOLEAN, defaultValue: false},
    isFloor: {type: DataTypes.BOOLEAN, defaultValue: false},
    isRoom: {type: DataTypes.BOOLEAN, defaultValue: false},

    isActive: {type: DataTypes.BOOLEAN, defaultValue: true},
    isDeleted: {type: DataTypes.BOOLEAN, defaultValue: false},
  };

  const options = {
    timestamps: true,
    defaultScope: {},
    scopes: {},
  };

  return sequelize.define("BuildingStructure", attributes, options);
}
