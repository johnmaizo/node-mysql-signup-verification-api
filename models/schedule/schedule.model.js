const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        classDay: { type: DataTypes.STRING, allowNull: false },
        classHour: { type: DataTypes.INTEGER, allowNull: false },
        staff: { type: DataTypes.STRING, allowNull: false },
        // foreign key staff
        courseCode: { type: DataTypes.STRING, allowNull: false },
        // foreign key course code
        roomNumber: { type: DataTypes.INTEGER, allowNull: false },
        // foreign key roomNumber
        isActive: { type: DataTypes.BOOLEAN }       
    };

    const options = {
        // disable default timestamp fields (createdAt and updatedAt)
        timestamps: false, 
        defaultScope: {
        },
        scopes: {
        }        
    };

    return sequelize.define('schedule', attributes, options);
}