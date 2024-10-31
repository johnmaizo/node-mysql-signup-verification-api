const {DataTypes} = require("sequelize");

module.exports = model;

function model(sequelize) {
  const attributes = {
    student_personal_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "student_personal_data",
        key: "student_personal_id",
      },
      allowNull: false,
      onDelete: "CASCADE",
    },

    program_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "programs", // refers to the table name
        key: "program_id", // refers to the column name in the programs table
      },
    },

    majorIn: {type: DataTypes.STRING, allowNull: true}, // Major In

    studentType: {type: DataTypes.STRING, allowNull: false}, // Regular, Irregular
    applicationType: {type: DataTypes.STRING(15), allowNull: false}, // Application type have three choices either Freshmen, Transferee, and Cross Enrollee

    semester_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "semesters",
        key: "semester_id",
      },
      allowNull: false,
    },

    yearLevel: {type: DataTypes.STRING, allowNull: true},

    yearEntry: {type: DataTypes.INTEGER(4), allowNull: false},
    yearGraduate: {type: DataTypes.INTEGER(4), allowNull: true},

    isActive: {type: DataTypes.BOOLEAN, defaultValue: true},
    isDeleted: {type: DataTypes.BOOLEAN, defaultValue: false},
  };

  const options = {
    // disable default timestamp fields (createdAt and updatedAt)
    timestamps: true,
    defaultScope: {},
    scopes: {},
  };

  return sequelize.define(
    "student_current_academicbackground",
    attributes,
    options
  );
}
