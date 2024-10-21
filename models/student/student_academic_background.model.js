const {DataTypes} = require("sequelize");

module.exports = model;

function model(sequelize) {
  const attributes = {
    applicant_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "applicants",
        key: "applicant_id",
      },
      allowNull: false,
      onDelete: "CASCADE",
    },

    // fulldata_applicant_id

    program_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "programs", // refers to the table name
        key: "program_id", // refers to the column name in the programs table
      },
    },

    majorIn: {type: DataTypes.STRING, allowNull: true}, // Major In

    studentType: {type: DataTypes.STRING, allowNull: false}, // Regular, Irregular
    applicationType: {type: DataTypes.STRING(15), allowNull: false},
    // Application type have three choices either Freshmen, Transferee, and Cross Enrollee

    semester_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "semesters",
        key: "semester_id",
      },
      allowNull: false,
    },

    // semesterType dapat naay choice either undergrad or grad
    semesterEntry: {type: DataTypes.STRING(10), allowNull: false},
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
    "studentcurrentacademicbackground",
    attributes,
    options
  );
}
