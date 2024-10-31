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

    cityAddress: {type: DataTypes.STRING(35), allowNull: true},
    cityTelNumber: {type: DataTypes.STRING(15), allowNull: true},
    provinceAddress: {type: DataTypes.STRING(95), allowNull: true},
    provinceTelNumber: {type: DataTypes.STRING(15), allowNull: true},

    isActive: {type: DataTypes.BOOLEAN, defaultValue: true},

    isDeleted: {type: DataTypes.BOOLEAN, defaultValue: false},
  };

  const options = {
    timestamps: true,
  };

  return sequelize.define("student_add_personal_data", attributes, options);
}
