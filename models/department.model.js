const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        department_id: { 
            type: DataTypes.INTEGER, 
            primaryKey: true,
            autoIncrement: true
        },

        campus_id: { 
            type: DataTypes.INTEGER,
            references: {
                model: 'campuses',
                key: 'campus_id'
            },
            allowNull: false // Department must belong to a campus
        },
        
        departmentCode: { 
            type: DataTypes.STRING, 
            allowNull: false 
        },
        departmentName: { 
            type: DataTypes.STRING, 
            allowNull: false 
        },
        departmentDean: { 
            type: DataTypes.STRING, 
            allowNull: false 
        },

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

    return sequelize.define('department', attributes, options);
}
