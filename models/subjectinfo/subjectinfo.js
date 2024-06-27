const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        subjectCode: { type: DataTypes.STRING, allowNull: false },
        subjectDescription: { type: DataTypes.STRING, allowNull: false },
        subjectCode: { type: DataTypes.STRING, allowNull: false },
        unit: { type: DataTypes.INTEGER, allowNull: false }, 
        // NEED IG COURSE ID NGA FOREIGN KEY
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

    return sequelize.define('subjectinfo', attributes, options);
}