const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        // student id naka foreign key
        provinceAddress: { type: DataTypes.STRING, allowNull: false },
        contactNumber: { type: DataTypes.STRING, allowNull: false },
        cityContactNumber: { type: DataTypes.INTEGER, allowNull: false },
        provinceContactNumber: { type: DataTypes.INTEGER, allowNull: false },
        email: { type: DataTypes.STRING, allowNull: false },
        citizenship: { type: DataTypes.STRING, allowNull: false },
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

    return sequelize.define('addStudentInfo', attributes, options);
}