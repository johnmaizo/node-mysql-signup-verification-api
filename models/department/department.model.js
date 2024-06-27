const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        departmentName: { type: DataTypes.STRING, allowNull: false },
        isActive: { type: DataTypes.BOOLEAN }       
    };

    const options = {
        // disable default timestamp fields (createdAt and updatedAt)
        timestamps: false, 
        defaultScope: {
        },
        scopes: {
        }        
    };

    return sequelize.define('department', attributes, options);
}