const {DataTypes} = require("sequelize");

module.exports = (sequelize) => {
  const History = sequelize.define(
    "History",
    {
      action: {type: DataTypes.STRING, allowNull: false},
      entity: {type: DataTypes.STRING, allowNull: false},
      entityId: {type: DataTypes.INTEGER, allowNull: false},
      changes: {type: DataTypes.JSON, allowNull: false},
      timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      adminId: {type: DataTypes.INTEGER, allowNull: false}, // Foreign key to Account
    },
    {
      timestamps: false,
    }
  );

  return History;
};
