const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        programCourse_id: { 
            type: DataTypes.INTEGER, 
            primaryKey: true,
            autoIncrement: true
        },
        
        program_id: { 
            type: DataTypes.INTEGER,
            references: {
                model: 'programs',
                key: 'program_id'
            }
        },

        course_id: { 
            type: DataTypes.INTEGER,
            references: {
                model: 'courseinfos',
                key: 'course_id'
            }
        },
        

        isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
        isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false }         
    };

    const options = {
        timestamps: true, 
        defaultScope: {
        },
        scopes: {
        }        
    };

    return sequelize.define('programcourse', attributes, options);
}
