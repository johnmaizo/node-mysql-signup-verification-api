const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        applicant_id: {
            type: DataTypes.INTEGER,
            references: {
              model: "applicants",
              key: "applicant_id",
            },
            allowNull: false,
            onDelete: "CASCADE",
          },

        campus_id: { 
            type: DataTypes.INTEGER,
            references: {
                model: 'campuses',
                key: 'campus_id'
            },
            allowNull: false 
        },
        
        firstName: { type: DataTypes.STRING(35), allowNull: false },
        middleName: { type: DataTypes.STRING(35), allowNull: true },
        lastName: { type: DataTypes.STRING(35), allowNull: false },
        gender: { type: DataTypes.STRING(10), allowNull: false },

        email: { type: DataTypes.STRING, allowNull: false, unique: true },
        contactNumber: { type: DataTypes.STRING(15), allowNull: false},
        
        civilStatus: { type: DataTypes.STRING(20), allowNull: false },
        birthDate: { type: DataTypes.DATEONLY, allowNull: false },
        birthPlace: { type: DataTypes.STRING(95), allowNull: false },
        
        religion: { type: DataTypes.STRING(30), allowNull: false },
        citizenship: { type: DataTypes.STRING(20), allowNull: false }, 
        country: { type: DataTypes.STRING(20), allowNull: false }, 
        ACR: { type: DataTypes.STRING, allowNull: true }, // ACR = Academic Record Code (For foreign students)
        
        isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
            
        isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false }  
    };

    const options = {
        timestamps: true,
    };

    return sequelize.define('student_personal_data', attributes, options);
}
