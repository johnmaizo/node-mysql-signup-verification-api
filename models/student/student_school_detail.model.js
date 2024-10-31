const {DataTypes} = require("sequelize");

module.exports = model;

function model(sequelize) {
  const attributes = {
    // applicant_id: {
    //     type: DataTypes.INTEGER,
    //     references: {
    //       model: "applicants",
    //       key: "applicant_id",
    //     },
    //     allowNull: false,
    //     onDelete: "CASCADE",
    //   },

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

    yearLevel: {type: DataTypes.INTEGER(4), allowNull: false}, //

    semester_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "semesters",
        key: "semester_id",
      },
      allowNull: false,
    },

    isActive: {type: DataTypes.BOOLEAN, defaultValue: true},
    isDeleted: {type: DataTypes.BOOLEAN, defaultValue: false},
  };

  const options = {
    // disable default timestamp fields (createdAt and updatedAt)
    timestamps: true,
    defaultScope: {},
    scopes: {},
  };

  return sequelize.define("studentschooldetail", attributes, options);
}
