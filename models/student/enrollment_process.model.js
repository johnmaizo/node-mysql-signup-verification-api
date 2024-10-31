const {DataTypes} = require("sequelize");

module.exports = model;

function model(sequelize) {
  const attributes = {
    enrollment_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
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

    registrar_status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "pending",
    },
    registrar_status_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    accounting_status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "pending",
    },
    accounting_status_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    payment_confirmed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    final_approval_status: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  };

  const options = {
    timestamps: true,
    tableName: "enrollment_process",
  };

  return sequelize.define("enrollment_process", attributes, options);
}
