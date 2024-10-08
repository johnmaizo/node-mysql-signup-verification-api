const {DataTypes} = require("sequelize");

module.exports = model;

function model(sequelize) {
  const attributes = {
    prospectus_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    program_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "programs",
        key: "program_id",
      },
    },

    prospectusName: {type: DataTypes.STRING, allowNull: false},
    prospectusDescription: {type: DataTypes.STRING, allowNull: false},

    isActive: {type: DataTypes.BOOLEAN, defaultValue: true},
    isDeleted: {type: DataTypes.BOOLEAN, defaultValue: false},
  };

  const options = {
    timestamps: true,
    defaultScope: {},
    scopes: {},
  };

  return sequelize.define("prospectus", attributes, options);
}
