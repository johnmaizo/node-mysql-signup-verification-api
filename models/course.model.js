const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        course_id: { 
            type: DataTypes.INTEGER, 
            primaryKey: true,
            autoIncrement: true
        },
        courseName: { type: DataTypes.STRING(50), allowNull: false },
        courseCode: { type: DataTypes.STRING(50), allowNull: false },
        department_id: { 
            type: DataTypes.INTEGER,
            references: {
                model: 'departments', // refers to the table name
                key: 'department_id'  // refers to the column name in the departments table
            }
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

    return sequelize.define('course', attributes, options);
}
