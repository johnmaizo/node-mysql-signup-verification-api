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
        department_id: { 
            type: DataTypes.INTEGER,
            references: {
                model: 'departments',
                key: 'department_id'
            }
        },
        course: { type: DataTypes.STRING, allowNull: false },
        majorIn: { type: DataTypes.STRING, allowNull: true },
        studentType: { type: DataTypes.STRING, allowNull: false },
        // semesterType dapat naay choice either undergrad or grad 
        semesterEntry: { type: DataTypes.STRING, allowNull: false },
        yearEntry: { type: DataTypes.INTEGER, allowNull: false },
        yearGraduate: { type: DataTypes.INTEGER, allowNull: true },
        applicationType: { type: DataTypes.STRING, allowNull: false },
        // Application type have three choices either Freshmen, Transferee, and Cross Enrollee

        isActive: { type: DataTypes.BOOLEAN, defaultValue: true }  
    };

    const options = {
        // disable default timestamp fields (createdAt and updatedAt)
        timestamps: true, 
        defaultScope: {
        },
        scopes: {
        }        
    };

    return sequelize.define('studentacademicbackground', attributes, options);
}