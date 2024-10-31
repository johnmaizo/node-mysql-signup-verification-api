const {DataTypes} = require("sequelize");

module.exports = model;

function model(sequelize) {
  const attributes = {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},

    student_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    campus_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "campuses",
        key: "campus_id",
      },
      allowNull: false,
    },

    // applicant_id: {
    //   type: DataTypes.INTEGER,
    //   references: {
    //     model: "applicants",
    //     key: "applicant_id",
    //   },
    //   allowNull: false,
    //   onDelete: "CASCADE",
    // },

    student_personal_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "student_personal_data",
        key: "student_personal_id",
      },
      allowNull: false,
      onDelete: "CASCADE",
    },

    isActive: {type: DataTypes.BOOLEAN, defaultValue: true},

    isDeleted: {type: DataTypes.BOOLEAN, defaultValue: false},
  };

  const options = {
    timestamps: true,
    freezeTableName: true, // Ensure table name remains as defined (no pluralization)
    tableName: "student_official", // Explicitly set the table name
    indexes: [
      {
        unique: true,
        fields: ["student_id", "campus_id"], // Add unique constraint here at model level as well
      },
    ],
  };

  return sequelize.define("student_official", attributes, options);
}
