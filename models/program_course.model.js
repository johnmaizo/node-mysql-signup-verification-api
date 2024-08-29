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
                model: 'programs', // refers to the table name
                key: 'program_id'  // refers to the column name in the programs table
            }
        },

        course_id: { 
            type: DataTypes.INTEGER,
            references: {
                model: 'courseinfos', // refers to the table name
                key: 'course_id'  // refers to the column name in the courseinfos table
            }
        },
        

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

    return sequelize.define('programcourse', attributes, options);
}
