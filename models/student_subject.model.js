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
        subject_code: { 
            type: DataTypes.STRING,
            references: {
                model: 'subjectinfos',
                key: 'subject_code'
            }
        },
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

    return sequelize.define('studentsubject', attributes, options);
}