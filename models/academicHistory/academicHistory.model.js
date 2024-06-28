const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        // student id naka foreign key
        elementarySchool: { type: DataTypes.STRING, allowNull: false },
        elementaryAddress: { type: DataTypes.STRING, allowNull: false },
        elementaryHonors: { type: DataTypes.STRING, allowNull: false },
        elementaryGraduate: { type: DataTypes.DATE, allowNull: false }, 
        secondarySchool: { type: DataTypes.STRING, allowNull: false },
        secondaryAddress: { type: DataTypes.STRING, allowNull: false },
        secondaryHonors: { type: DataTypes.STRING, allowNull: false },
        secondaryGraduate: { type: DataTypes.DATE, allowNull: false },
        seniorHighSchool: { type: DataTypes.STRING, allowNull: false },
        seniorHighAddress: { type: DataTypes.STRING, allowNull: false },
        seniorHighHonors: { type: DataTypes.STRING, allowNull: false },
        seniorHighSchoolGraduate: { type: DataTypes.DATE, allowNull: false },
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

    return sequelize.define('academicHistory', attributes, options);
}