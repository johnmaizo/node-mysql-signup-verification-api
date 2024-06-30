const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        department_id: { 
            type: DataTypes.INTEGER, 
            primaryKey: true,
            autoIncrement: true
        },
        departmentName: { 
            type: DataTypes.STRING, 
            allowNull: false 
        },
        isActive: { type: DataTypes.BOOLEAN, defaultValue: true }    
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
