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
        } ,
        elementarySchool: { type: DataTypes.STRING, allowNull: false },
        elementaryAddress: { type: DataTypes.STRING, allowNull: false },
        elementaryHonors: { type: DataTypes.STRING, allowNull: true },
        elementaryGraduate: { type: DataTypes.DATE, allowNull: false }, 
        secondarySchool: { type: DataTypes.STRING, allowNull: false },
        secondaryAddress: { type: DataTypes.STRING, allowNull: false },
        secondaryHonors: { type: DataTypes.STRING, allowNull: true },
        secondaryGraduate: { type: DataTypes.DATE, allowNull: false },
        seniorHighSchool: { type: DataTypes.STRING, allowNull: false },
        seniorHighAddress: { type: DataTypes.STRING, allowNull: false },
        seniorHighHonors: { type: DataTypes.STRING, allowNull: true },
        seniorHighSchoolGraduate: { type: DataTypes.DATE, allowNull: false },
        isActive: { type: DataTypes.BOOLEAN, defaultValue: true }  
    };

    const options = {
        // disable default timestamp fields (createdAt and updatedAt)
        timestamps: false, 
        defaultScope: {
        },
        scopes: {
        }        
    };

    return sequelize.define('academichistory', attributes, options);
}