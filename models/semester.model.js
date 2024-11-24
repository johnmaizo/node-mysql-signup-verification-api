const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
  const attributes = {
    semester_id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },

    campus_id: { 
        type: DataTypes.INTEGER,
        references: {
            model: 'campuses',
            key: 'campus_id'
        },
        allowNull: false // Department must belong to a campus
    },

    semesterName: { 
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: {
          args: [['1st Semester', '2nd Semester', 'Summer']],
          msg: 'semesterName must be one of "1st Semester", "2nd Semester", or "Summer".',
        },
      },
    },

    schoolYear: { 
      type: DataTypes.STRING(9), 
      allowNull: false,
      validate: {
        is: /^\d{4}-\d{4}$/, // Regex to enforce "YYYY-YYYY" format
        isValidYearDifference(value) {
          const years = value.split('-');
          const startYear = parseInt(years[0], 10);
          const endYear = parseInt(years[1], 10);

          if (endYear !== startYear + 1) {
            throw new Error('The end year must be exactly one year after the start year.');
          }
        }
      }
    },
    isActive: { 
      type: DataTypes.BOOLEAN, 
      defaultValue: true 
    },
    isDeleted: { 
      type: DataTypes.BOOLEAN, 
      defaultValue: false 
    }  
  };

  const options = {
    timestamps: true,
  };

  return sequelize.define('semester', attributes, options);
}
