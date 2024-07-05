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
        course: { type: DataTypes.STRING(50), allowNull: false },
        majorIn: { type: DataTypes.STRING(50), allowNull: true },
        studentType: { type: DataTypes.STRING, allowNull: false },
        // semesterType dapat naay choice either undergrad or grad 
        semesterEntry: { type: DataTypes.STRING(10), allowNull: false },
        yearEntry: { type: DataTypes.INTEGER(4), allowNull: false },
        yearGraduate: { type: DataTypes.INTEGER(4), allowNull: true },
        applicationType: { type: DataTypes.STRING(15), allowNull: false },
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