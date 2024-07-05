const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        student_id: { 
            type: DataTypes.STRING, 
            primaryKey: true, 
        },
        firstName: { type: DataTypes.STRING(35), allowNull: false },
        middleName: { type: DataTypes.STRING(15), allowNull: true },
        lastName: { type: DataTypes.STRING(35), allowNull: false },
        gender: { type: DataTypes.STRING(10), allowNull: false },
        email: { type: DataTypes.STRING, allowNull: false, unique: true },
        civilStatus: { type: DataTypes.STRING(20), allowNull: false },
        birthDate: { type: DataTypes.DATEONLY, allowNull: false },
        birthPlace: { type: DataTypes.STRING(95), allowNull: false },
        
        religion: { type: DataTypes.STRING(30), allowNull: false },
        citizenship: { type: DataTypes.STRING(20), allowNull: false }, 
        country: { type: DataTypes.STRING(20), allowNull: false }, 
        ACR: { type: DataTypes.STRING, allowNull: true }, // ACR = Academic Record Code (For foreign students)
        
        isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
    };

    const options = {
        timestamps: true,
    };

    return sequelize.define('student', attributes, options);
}
