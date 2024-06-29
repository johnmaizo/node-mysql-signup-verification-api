const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        firstName: { type: DataTypes.STRING, allowNull: false },
        middleName: { type: DataTypes.STRING, allowNull: false },
        lastName: { type: DataTypes.STRING, allowNull: false },
        gender: { type: DataTypes.STRING, allowNull: false },
        birthDate: { type: DataTypes.DATE, allowNull: false },
        birthPlace: { type: DataTypes.STRING, allowNull: false },
        maritalStatus: { type: DataTypes.STRING, allowNull: false },
        religion: { type: DataTypes.STRING, allowNull: false },
        country: { type: DataTypes.STRING, allowNull: false },
        isActive: { type: DataTypes.BOOLEAN }       
    };

    const options = {
        // disable default timestamp fields (createdAt and updatedAt)
        timestamps: false, 
        defaultScope: {
        },
        scopes: {
        }        
    };

    return sequelize.define('student-data', attributes, options);
}