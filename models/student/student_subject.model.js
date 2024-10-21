const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        student_id: {
            type: DataTypes.INTEGER,
            references: {
              model: "student_official",
              key: "id",
            },
          },

        prospectus_subject_id: {
            type: DataTypes.INTEGER,
            references: {
              model: "prospectus_subjects",
              key: "prospectus_subject_id",
            },
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

    return sequelize.define('student_subject', attributes, options);
}