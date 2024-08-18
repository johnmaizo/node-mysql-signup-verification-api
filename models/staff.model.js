const {DataTypes} = require("sequelize");

module.exports = model;

function model(sequelize) {
  const attributes = {
    staff_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    staffRole: { type: DataTypes.STRING(25), allowNull: false },

    firstName: {type: DataTypes.STRING(35), allowNull: false},
    middleName: {type: DataTypes.STRING(15), allowNull: false},
    lastName: {type: DataTypes.STRING(35), allowNull: false},
    

    staffAddress: { type: DataTypes.STRING(95), allowNull: false },
    contactNumber: { type: DataTypes.STRING(15), allowNull: false },
    email: { type: DataTypes.STRING(62), allowNull: false, unique: true },



    isActive: {type: DataTypes.BOOLEAN, defaultValue: true},
    
    isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false }  
  };

  const options = {
    // disable default timestamp fields (createdAt and updatedAt)
    timestamps: true,
    defaultScope: {},
    scopes: {},
  };

  return sequelize.define("staff", attributes, options);
}
