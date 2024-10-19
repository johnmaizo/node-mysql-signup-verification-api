const {DataTypes} = require("sequelize");

module.exports = model;

function model(sequelize) {
  const attributes = {
    applicant_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    applicant_id_external: {type: DataTypes.INTEGER, allowNull: true},
    campus_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "campuses",
        key: "campus_id",
      },
      allowNull: false,
    },

    program_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "programs", // refers to the table name
        key: "program_id", // refers to the column name in the programs table
      },
    },
    enrollmentType: {
      type: DataTypes.STRING(20),
      allowNull: false,
    }, // 'online', 'regular'

    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "pending",
    }, // 'pending', 'enrolled'
    firstName: {type: DataTypes.STRING(35), allowNull: false},
    middleName: {type: DataTypes.STRING(35), allowNull: true},
    lastName: {type: DataTypes.STRING(35), allowNull: false},
    suffix: {type: DataTypes.STRING(10), allowNull: true},
    gender: {type: DataTypes.STRING(10), allowNull: false},
    birthDate: {type: DataTypes.DATEONLY, allowNull: false},
    email: {type: DataTypes.STRING, allowNull: false},
    contactNumber: {type: DataTypes.STRING(15), allowNull: false},
    address: {type: DataTypes.STRING, allowNull: false},
    yearLevel: {type: DataTypes.STRING(20), allowNull: false},
    isTransferee: {type: DataTypes.BOOLEAN, allowNull: false},
    // campus: {type: DataTypes.STRING, allowNull: false},
    // program: {type: DataTypes.STRING, allowNull: false},

    isActive: {type: DataTypes.BOOLEAN, defaultValue: true},
    isDeleted: {type: DataTypes.BOOLEAN, defaultValue: false},

    dateEnrolled: {type: DataTypes.DATE, allowNull: true},
  };

  const options = {
    timestamps: true,
  };

  return sequelize.define("applicant", attributes, options);
}
