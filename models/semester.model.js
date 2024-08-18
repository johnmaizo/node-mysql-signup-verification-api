const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        semester_id: { 
            type: DataTypes.INTEGER, 
            primaryKey: true, 
            autoIncrement: true 
        },
        semesterName: { 
            type: DataTypes.STRING(20), 
            allowNull: false 
        },
        schoolYear: { 
            type: DataTypes.STRING(9), // Example format: "2023-2024"
            allowNull: false 
        },
        isActive: { 
            type: DataTypes.BOOLEAN, 
            defaultValue: true 
        },
            
        isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false }  
    };

    const options = {
        timestamps: true,
    };

    return sequelize.define('semester', attributes, options);
}
