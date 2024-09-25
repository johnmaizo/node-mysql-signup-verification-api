const {DataTypes} = require("sequelize");

module.exports = (sequelize) => {
  const attributes = {
    employee_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    campus_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // SuperAdmin won't have a campus_id
      references: {
        model: "campuses",
        key: "campus_id",
      },
      validate: {
        isNotSuperAdmin() {
          // Make sure this validation only triggers if the role is defined
          if (this.role && this.role !== "SuperAdmin" && !this.campus_id) {
            throw new Error(
              "Accounts other than SuperAdmin must be associated with a campus"
            );
          }
        },
      },
    },

    role: {type: DataTypes.STRING, allowNull: false},
    roleType: {type: DataTypes.STRING, allowNull: true},

    title: {type: DataTypes.STRING, allowNull: false},

    firstName: {type: DataTypes.STRING, allowNull: false},
    middleName: {type: DataTypes.STRING, allowNull: true},
    lastName: {type: DataTypes.STRING, allowNull: false},

    gender: {type: DataTypes.STRING(10), allowNull: false},
    address: {type: DataTypes.STRING(95), allowNull: false},
    contactNumber: {type: DataTypes.STRING(15), allowNull: false},

    isActive: {type: DataTypes.BOOLEAN, defaultValue: true},

    isDeleted: {type: DataTypes.BOOLEAN, defaultValue: false},
  };

  return sequelize.define("employee", attributes);
};
