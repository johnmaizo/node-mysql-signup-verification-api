const {DataTypes} = require("sequelize");

module.exports = model;

function model(sequelize) {
  const attributes = {
    prospectus_subject_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    prospectus_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "prospectus",
        key: "prospectus_id",
      },
    },

    yearLevel: {type: DataTypes.STRING, allowNull: false},

    course_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "courseinfos",
        key: "course_id",
      },
    },

    isActive: {type: DataTypes.BOOLEAN, defaultValue: true},
    isDeleted: {type: DataTypes.BOOLEAN, defaultValue: false},
  };

  const options = {
    timestamps: true,
    defaultScope: {},
    scopes: {},
  };

  return sequelize.define("prospectus_subject", attributes, options);
}
