const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        subject_id: { 
            type: DataTypes.INTEGER, 
            primaryKey: true,
            autoIncrement: true
        },
        subjectCode: { 
            type: DataTypes.STRING, 
            allowNull: false 
        },
        subjectDescription: { 
            type: DataTypes.STRING, 
            allowNull: false 
        },
        unit: { 
            type: DataTypes.INTEGER, 
            allowNull: false 
        },
        
        course_id: { 
            type: DataTypes.INTEGER,
            references: {
                model: 'courses', // refers to the table name
                key: 'course_id'  // refers to the column name in the courses table
            }
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

    return sequelize.define('subjectinfo', attributes, options);
}
