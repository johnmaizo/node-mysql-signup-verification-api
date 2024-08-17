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
        departmentCode: { 
            type: DataTypes.STRING, 
            allowNull: false 
        },
        departmentDean: { 
            type: DataTypes.STRING, 
            allowNull: false 
        },

        campus_id: { 
            type: DataTypes.INTEGER,
            references: {
                model: 'campuses',
                key: 'campus_id'
            },
            allowNull: false // Assuming a department must belong to a campus
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

    return sequelize.define('department', attributes, options);
}
