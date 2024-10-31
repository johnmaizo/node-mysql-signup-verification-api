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

    elementarySchool: {type: DataTypes.STRING(50), allowNull: true},
    elementaryAddress: {type: DataTypes.STRING(95), allowNull: true},
    elementaryHonors: {type: DataTypes.STRING(30), allowNull: true},
    elementaryGraduate: {type: DataTypes.DATE, allowNull: true},
    secondarySchool: {type: DataTypes.STRING(50), allowNull: true},
    secondaryAddress: {type: DataTypes.STRING(95), allowNull: true},
    secondaryHonors: {type: DataTypes.STRING(30), allowNull: true},
    secondaryGraduate: {type: DataTypes.DATE, allowNull: true},
    seniorHighSchool: {type: DataTypes.STRING(50), allowNull: true},
    seniorHighAddress: {type: DataTypes.STRING(95), allowNull: true},
    seniorHighHonors: {type: DataTypes.STRING(30), allowNull: true},
    seniorHighSchoolGraduate: {type: DataTypes.DATE, allowNull: true},
    isActive: {type: DataTypes.BOOLEAN, defaultValue: true},

    isDeleted: {type: DataTypes.BOOLEAN, defaultValue: false},
  };

  const options = {
    // disable default timestamp fields (createdAt and updatedAt)
    timestamps: true,
    defaultScope: {},
    scopes: {},
  };

  return sequelize.define("student_academic_history", attributes, options);
}
