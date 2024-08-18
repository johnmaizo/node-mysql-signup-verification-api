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
        },

        // Father
        fatherFirstName: { type: DataTypes.STRING(35), allowNull: true },
        fatherMiddleName: { type: DataTypes.STRING(15), allowNull: true },
        fatherLastName: { type: DataTypes.STRING(35), allowNull: true },
        fatherAddress: { type: DataTypes.STRING(95), allowNull: true },
        fatherOccupation: { type: DataTypes.STRING(30), allowNull: true },
        fatherContactNumber: { type: DataTypes.STRING(15), allowNull: true },
        fatherCompanyName: { type: DataTypes.STRING(50), allowNull: true },
        fatherCompanyAddress: { type: DataTypes.STRING(95), allowNull: true },
        fatherEmail: { type: DataTypes.STRING(62), allowNull: true },
        fatherIncome: { type: DataTypes.STRING(20), allowNull: true },


        // Mother
        motherFirstName: { type: DataTypes.STRING(35), allowNull: true },
        motherMiddleName: { type: DataTypes.STRING(15), allowNull: true },
        motherLastName: { type: DataTypes.STRING(35), allowNull: true },
        motherAddress: { type: DataTypes.STRING(95), allowNull: true },
        motherOccupation: { type: DataTypes.STRING(30), allowNull: true },
        motherContactNumber: { type: DataTypes.STRING(15), allowNull: true },
        motherCompanyName: { type: DataTypes.STRING(50), allowNull: true },
        motherCompanyAddress: { type: DataTypes.STRING(95), allowNull: true },
        motherEmail: { type: DataTypes.STRING(62), allowNull: true },
        motherIncome: { type: DataTypes.STRING(20), allowNull: true },


        // Guardian
        guardianFirstName: { type: DataTypes.STRING(35), allowNull: true },
        guardianMiddleName: { type: DataTypes.STRING(15), allowNull: true },
        guardianLastName: { type: DataTypes.STRING(35), allowNull: true },
        guardianRelation: { type: DataTypes.STRING(20), allowNull: true },
        guardianContactNumber: { type: DataTypes.STRING(15), allowNull: true },
        
        isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
            
        isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false }  
    };

    const options = {
        timestamps: true,
    };

    return sequelize.define('studentfamily', attributes, options);
}
