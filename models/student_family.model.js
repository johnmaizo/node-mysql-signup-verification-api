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
        fatherFirstName: { type: DataTypes.STRING, allowNull: false },
        fatherMiddleName: { type: DataTypes.STRING, allowNull: false },
        fatherLastName: { type: DataTypes.STRING, allowNull: false },
        fatherContactNumber: { type: DataTypes.STRING, allowNull: false },
        fatherEmail: { type: DataTypes.STRING, allowNull: false },
        fatherOccupation: { type: DataTypes.STRING, allowNull: false },
        fatherIncome: { type: DataTypes.STRING, allowNull: false },
        fatherCompany: { type: DataTypes.STRING, allowNull: false },
        motherFirstName: { type: DataTypes.STRING, allowNull: false },
        motherMiddleName: { type: DataTypes.STRING, allowNull: false },
        motherLastName: { type: DataTypes.STRING, allowNull: false },
        motherEmail: { type: DataTypes.STRING, allowNull: false },
        motherContactNumber: { type: DataTypes.STRING, allowNull: false },
        motherOccupation: { type: DataTypes.STRING, allowNull: false },
        motherIncome: { type: DataTypes.STRING, allowNull: false },
        motherCompany: { type: DataTypes.STRING, allowNull: false },
        guardianFirstName: { type: DataTypes.STRING, allowNull: false },
        guardianMiddleName: { type: DataTypes.STRING, allowNull: false },
        guardianLastName: { type: DataTypes.STRING, allowNull: false },
        guardianRelation: { type: DataTypes.STRING, allowNull: false },
        guardianContactNumber: { type: DataTypes.STRING, allowNull: false },
        guardianEmail: { type: DataTypes.STRING, allowNull: false },
        isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
    };

    const options = {
        timestamps: false,
    };

    return sequelize.define('studentfamily', attributes, options);
}
