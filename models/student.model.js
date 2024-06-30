const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        student_id: { 
            type: DataTypes.STRING, 
            primaryKey: true, 
        },
        firstName: { type: DataTypes.STRING, allowNull: false },
        middleName: { type: DataTypes.STRING, allowNull: false },
        lastName: { type: DataTypes.STRING, allowNull: false },
        birthDate: { type: DataTypes.DATE, allowNull: false },
        civilStatus: { type: DataTypes.STRING, allowNull: false },
        gender: { type: DataTypes.STRING, allowNull: false },
        religion: { type: DataTypes.STRING, allowNull: false },

        birthDate: { type: DataTypes.DATE, allowNull: false },
        birthPlace: { type: DataTypes.STRING, allowNull: false },
        country: { type: DataTypes.STRING, allowNull: false },
        citizenship: { type: DataTypes.STRING, allowNull: false },
        
        isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
    };

    const options = {
        timestamps: false,
    };

    return sequelize.define('student', attributes, options);
}
