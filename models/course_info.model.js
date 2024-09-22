const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        course_id: { 
            type: DataTypes.INTEGER, 
            primaryKey: true,
            autoIncrement: true
        },

        campus_id: {
            type: DataTypes.INTEGER,
            references: {
              model: "campuses",
              key: "campus_id",
            },
            allowNull: false, // Department must belong to a campus
        },

        department_id: { 
            type: DataTypes.INTEGER,
            references: {
                model: 'departments', // refers to the table name
                key: 'department_id'  // refers to the column name in the departments table
            },
            allowNull: true, // SuperAdmin won't have a campus_id
        }, 

        
        courseCode: { 
            type: DataTypes.STRING, 
            allowNull: false 
        },
        courseDescription: { 
            type: DataTypes.STRING, 
            allowNull: false 
        },
        unit: { 
            type: DataTypes.INTEGER, 
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

    return sequelize.define('courseinfo', attributes, options);
}
