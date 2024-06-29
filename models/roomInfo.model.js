const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        floorLevel: { type: DataTypes.STRING, allowNull: false },
        roomNumber: { type: DataTypes.INTEGER, allowNull: false },
        building: { type: DataTypes.STRING, allowNull: false },

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

    return sequelize.define('roomInfo', attributes, options);
}