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
        elementarySchool: { type: DataTypes.STRING(50), allowNull: false },
        elementaryAddress: { type: DataTypes.STRING(95), allowNull: false },
        elementaryHonors: { type: DataTypes.STRING(20), allowNull: true },
        elementaryGraduate: { type: DataTypes.DATE, allowNull: false }, 
        secondarySchool: { type: DataTypes.STRING(50), allowNull: false },
        secondaryAddress: { type: DataTypes.STRING(95), allowNull: false },
        secondaryHonors: { type: DataTypes.STRING(20), allowNull: true },
        secondaryGraduate: { type: DataTypes.DATE, allowNull: false },
        seniorHighSchool: { type: DataTypes.STRING(50), allowNull: false },
        seniorHighAddress: { type: DataTypes.STRING(95), allowNull: false },
        seniorHighHonors: { type: DataTypes.STRING(20), allowNull: true },
        seniorHighSchoolGraduate: { type: DataTypes.DATE, allowNull: false },
        isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
            
        isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false }    
    };

    const options = {
        // disable default timestamp fields (createdAt and updatedAt)
        timestamps: true, 
        defaultScope: {
        },
        scopes: {
        }        
    };

    return sequelize.define('academichistory', attributes, options);
}