const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        schedule_id: { 
            type: DataTypes.INTEGER, 
            primaryKey: true,
            autoIncrement: true
        },
        classDay: { type: DataTypes.STRING(15), allowNull: false },
        classHour: { type: DataTypes.INTEGER(10), allowNull: false },
        staff: { type: DataTypes.STRING(50), allowNull: false },
        courseCode: { type: DataTypes.STRING(20), allowNull: false },
        room_id: {
            type: DataTypes.INTEGER(3),
            references: {
                model: 'roominfos',
                key: 'room_id'
            }
        },
        isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
    };

    const options = {
        // disable default timestamp fields (createdAt and updatedAt)
        timestamps: true, 
        defaultScope: {
        },
        scopes: {
        }        
    };

    return sequelize.define('schedule', attributes, options);
}