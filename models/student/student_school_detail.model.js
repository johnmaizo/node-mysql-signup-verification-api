const {DataTypes} = require("sequelize");

module.exports = model;

function model(sequelize) {
  const attributes = {
    student_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "student_official",
        key: "id",
      },
    },

    program_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "programs", // refers to the table name
        key: "program_id", // refers to the column name in the programs table
      },
    },

    yearLevel: {type: DataTypes.INTEGER(4), allowNull: false},

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
