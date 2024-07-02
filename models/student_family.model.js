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
        fatherFirstName: { type: DataTypes.STRING, allowNull: true },
        fatherMiddleName: { type: DataTypes.STRING, allowNull: true },
        fatherLastName: { type: DataTypes.STRING, allowNull: true },
        fatherAddress: { type: DataTypes.STRING, allowNull: true },
        fatherOccupation: { type: DataTypes.STRING, allowNull: true },
        fatherContactNumber: { type: DataTypes.STRING, allowNull: true },
        fatherCompanyName: { type: DataTypes.STRING, allowNull: true },
        fatherCompanyAddress: { type: DataTypes.STRING, allowNull: true },
        fatherEmail: { type: DataTypes.STRING, allowNull: true },
        fatherIncome: { type: DataTypes.STRING, allowNull: true },


        // Mother
        motherFirstName: { type: DataTypes.STRING, allowNull: true },
        motherMiddleName: { type: DataTypes.STRING, allowNull: true },
        motherLastName: { type: DataTypes.STRING, allowNull: true },
        motherAddress: { type: DataTypes.STRING, allowNull: true },
        motherOccupation: { type: DataTypes.STRING, allowNull: true },
        motherContactNumber: { type: DataTypes.STRING, allowNull: true },
        motherIncome: { type: DataTypes.STRING, allowNull: true },
        motherCompanyName: { type: DataTypes.STRING, allowNull: true },
        motherCompanyAddress: { type: DataTypes.STRING, allowNull: true },


        // Guardian
        guardianFirstName: { type: DataTypes.STRING, allowNull: true },
        guardianMiddleName: { type: DataTypes.STRING, allowNull: true },
        guardianLastName: { type: DataTypes.STRING, allowNull: true },
        guardianRelation: { type: DataTypes.STRING, allowNull: true },
        guardianContactNumber: { type: DataTypes.STRING, allowNull: true },
        
        isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
    };

    const options = {
        timestamps: true,
    };

    return sequelize.define('studentfamily', attributes, options);
}
