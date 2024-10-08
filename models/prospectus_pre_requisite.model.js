const {DataTypes} = require("sequelize");

module.exports = model;

function model(sequelize) {
  const attributes = {
    pre_requisite_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    prospectus_subject_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "prospectus_subjects",
        key: "prospectus_subject_id",
      },
    },

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

  return sequelize.define("prospectus_pre_requisite", attributes, options);
}
