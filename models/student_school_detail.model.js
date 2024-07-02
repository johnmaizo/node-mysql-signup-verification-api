const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        student_id: { 
            type: DataTypes.STRING,
            references: {
                model: 'students',
                key: 'student_id'
            }
        },
        course_id: { 
            type: DataTypes.INTEGER,
            references: {
                model: 'courses',
                key: 'course_id'
            }
        },
        department_id: { 
            type: DataTypes.INTEGER,
            references: {
                model: 'departments', // refers to the table name
                key: 'department_id'  // refers to the column name in the departments table
            }
        },
        yearLevel: { type: DataTypes.INTEGER, allowNull: false },
        semester: { type: DataTypes.STRING, allowNull: false },
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

    return sequelize.define('studentschooldetail', attributes, options);
}