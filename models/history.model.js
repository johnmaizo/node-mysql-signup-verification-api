const {DataTypes} = require("sequelize");

module.exports = (sequelize) => {
  const History = sequelize.define(
    "history",
    {
      action: {type: DataTypes.STRING, allowNull: false}, // e.g., 'create', 'update', 'delete'
      entity: {type: DataTypes.STRING, allowNull: false}, // e.g., 'Course', 'Department'
      entityId: {type: DataTypes.INTEGER, allowNull: false}, // ID of the entity that was modified
      changes: {type: DataTypes.JSON, allowNull: false}, // JSON object to store the changes
      timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      accountId: {type: DataTypes.INTEGER, allowNull: false}, // Foreign key to Account
    },
    {
      timestamps: false,
    }
  );

  return History;
};
