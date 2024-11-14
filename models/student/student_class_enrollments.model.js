// models/student_class_enrollments.model.js

const {DataTypes} = require("sequelize");

module.exports = model;

function model(sequelize) {
  const attributes = {
    student_class_enrollment_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    student_personal_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "student_personal_data",
        key: "student_personal_id",
      },
      allowNull: false,
    },
    class_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "enlisted", // Possible values: 'enlisted', 'enrolled'
    },
    isActive: {type: DataTypes.BOOLEAN, defaultValue: true},
    isDeleted: {type: DataTypes.BOOLEAN, defaultValue: false},
  };

  const options = {
    timestamps: true,
    defaultScope: {},
    scopes: {},
  };

  return sequelize.define("student_class_enrollments", attributes, options);
}
