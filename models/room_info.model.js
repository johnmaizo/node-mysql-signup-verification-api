const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        room_id: { 
            type: DataTypes.INTEGER, 
            primaryKey: true, 
            autoIncrement: true
        },
        floorLevel: { type: DataTypes.INTEGER, allowNull: false },
        roomNumber: { type: DataTypes.INTEGER, allowNull: false },
        building: { type: DataTypes.STRING(25), allowNull: false },

        isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
            
        isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false }   
    };

    const options = {
        // disable default timestamp fields (createdAt and updatedAt)
        timestamps: true, 
        defaultScope: {
        },
        scopes: {
        }        
    };

    return sequelize.define('roominfo', attributes, options);
}