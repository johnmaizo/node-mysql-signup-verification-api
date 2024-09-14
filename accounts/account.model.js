const {DataTypes} = require("sequelize");

module.exports = model;

function model(sequelize) {
  const attributes = {
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

    email: {type: DataTypes.STRING, allowNull: false},
    passwordHash: {type: DataTypes.STRING, allowNull: true}, // allowNull to 'true' for not admins, registrars
    title: {type: DataTypes.STRING, allowNull: false},
    firstName: {type: DataTypes.STRING, allowNull: false},
    middleName: {type: DataTypes.STRING, allowNull: true},
    lastName: {type: DataTypes.STRING, allowNull: false},
    
    gender: { type: DataTypes.STRING(10), allowNull: false },
    address: {type: DataTypes.STRING(95), allowNull: false},
    contactNumber: { type: DataTypes.STRING(15), allowNull: false },

    acceptTerms: {type: DataTypes.BOOLEAN},
    verificationToken: {type: DataTypes.STRING},
    verified: {type: DataTypes.DATE},
    resetToken: {type: DataTypes.STRING},
    resetTokenExpires: {type: DataTypes.DATE},
    passwordReset: {type: DataTypes.DATE},

    created: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated: {type: DataTypes.DATE},
    isVerified: {
      type: DataTypes.VIRTUAL,
      get() {
        return !!(this.verified || this.passwordReset);
      },
    },
  };

  const options = {
    // disable default timestamp fields (createdAt and updatedAt)
    timestamps: false,
    defaultScope: {
      // exclude password hash by default
      attributes: {exclude: ["passwordHash"]},
    },
    scopes: {
      // include hash with this scope
      withHash: {attributes: {}},
    },
  };

  return sequelize.define("account", attributes, options);
}
