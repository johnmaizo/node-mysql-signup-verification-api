const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        subject_code: { 
            type: DataTypes.STRING, 
            primaryKey: true, 
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
        isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
        course_id: { 
            type: DataTypes.INTEGER,
            references: {
                model: 'courses', // refers to the table name
                key: 'course_id'  // refers to the column name in the courses table
            }
        },

        courseName: { type: DataTypes.STRING, allowNull: false },
            
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
