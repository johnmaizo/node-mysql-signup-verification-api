const {DataTypes} = require("sequelize");

module.exports = model;

function model(sequelize) {
  const attributes = {
    teacher_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    department_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "departments",
        key: "department_id",
      },
    },

    firstName: {type: DataTypes.STRING(35), allowNull: false},
    middleName: {type: DataTypes.STRING(15), allowNull: false},
    lastName: {type: DataTypes.STRING(35), allowNull: false},
    

    teacherAddress: { type: DataTypes.STRING(95), allowNull: false },
    contactNumber: { type: DataTypes.STRING(15), allowNull: false },
    email: { type: DataTypes.STRING(62), allowNull: false, unique: true },



    isActive: {type: DataTypes.BOOLEAN, defaultValue: true},
  };

  const options = {
    // disable default timestamp fields (createdAt and updatedAt)
    timestamps: true,
    defaultScope: {},
    scopes: {},
  };

  return sequelize.define("teacher", attributes, options);
}
