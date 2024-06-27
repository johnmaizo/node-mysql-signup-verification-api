const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        // student id naka foreign key
        // department id naka foreign key
        course: { type: DataTypes.STRING, allowNull: false },
        majorIn: { type: DataTypes.STRING, allowNull: false },
        studentType: { type: DataTypes.STRING, allowNull: false },
        semesterEntry: { type: DataTypes.STRING, allowNull: false }, 
        // semesterEntry dapat naay choice either undergrad or grad 
        yearEntry: { type: DataTypes.STRING, allowNull: false },
        yearGraduate: { type: DataTypes.STRING, allowNull: false },
        applicationType: { type: DataTypes.STRING, allowNull: false },
        // Application type have three choices either Freshmen, Transferee, and Cross Enrollee
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

    return sequelize.define('academicBackground', attributes, options);
}