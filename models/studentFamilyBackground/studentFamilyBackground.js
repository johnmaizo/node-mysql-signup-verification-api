const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        // student id naka foreign key
        fatherFirstName: { type: DataTypes.STRING, allowNull: false },
        fatherMiddleName: { type: DataTypes.STRING, allowNull: false },
        fatherLastName: { type: DataTypes.STRING, allowNull: false },
        fatherContactNumber: { type: DataTypes.INTEGER, allowNull: false },
        fatherEmail: { type: DataTypes.STRING, allowNull: false },
        fatherOccupation: { type: DataTypes.STRING, allowNull: false },
        fatherIncome: { type: DataTypes.STRING, allowNull: false },
        fatherCompany: { type: DataTypes.STRING, allowNull: false },
        motherFirstName: { type: DataTypes.STRING, allowNull: false },
        motherMiddleName: { type: DataTypes.STRING, allowNull: false },
        motherLastName: { type: DataTypes.STRING, allowNull: false },
        motherContactNumber: { type: DataTypes.INTEGER, allowNull: false },
        motherEmail: { type: DataTypes.STRING, allowNull: false },
        motherOccupation: { type: DataTypes.STRING, allowNull: false },
        motherIncome: { type: DataTypes.STRING, allowNull: false },
        motherCompany: { type: DataTypes.STRING, allowNull: false },
        guardianFirstName: { type: DataTypes.STRING, allowNull: false },
        guardianMiddleName: { type: DataTypes.STRING, allowNull: false },
        guardianLastName: { type: DataTypes.STRING, allowNull: false },
        guardianRelation: { type: DataTypes.STRING, allowNull: false },
        guardianContactNumber: { type: DataTypes.INTEGER, allowNull: false },
        guardianEmail: { type: DataTypes.STRING, allowNull: false },
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

    return sequelize.define('studentFamilyBackground', attributes, options);
}