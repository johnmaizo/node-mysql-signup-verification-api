const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        campus_id: { 
            type: DataTypes.INTEGER, 
            primaryKey: true,
            autoIncrement: true
        },
        campusName: { 
            type: DataTypes.STRING, 
            allowNull: false 
        },
        campusAddress: { 
            type: DataTypes.STRING, 
            allowNull: false 
        },
        isActive: { type: DataTypes.BOOLEAN, defaultValue: true }    
    };

    const options = {
        // disable default timestamp fields (createdAt and updatedAt)
        timestamps: true, 
        defaultScope: {
        },
        scopes: {
        }        
    };

    return sequelize.define('campus', attributes, options);
}
