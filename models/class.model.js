const {isSchema} = require("joi");
const {DataTypes} = require("sequelize");

module.exports = model;

function model(sequelize) {
  const attributes = {
    class_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    className: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    course_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "courseinfos",
        key: "course_id",
      },
    },

    semester_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "semesters",
        key: "semester_id",
      },
      allowNull: false,
    },

    // Teacher
    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "employees",
        key: "employee_id",
      },
    },

    // Room
    // structure_id: {
    //   type: DataTypes.INTEGER,
    //   allowNull: false,
    //   references: {
    //     model: "buildingstructures",
    //     key: "structure_id",
    //   },
    // },
    // ! MOCK UP RANG SCHEDULE ( PERO DAPAT NAA NIY BUILDING STRUCTURES)

    schedule: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  };

  const options = {
    timestamps: true,
  };

  return sequelize.define("class", attributes, options);
}
