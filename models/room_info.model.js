const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        room_id: { 
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
            allowNull: false // Room Info must belong to a campus
        },
        
        lot: { type: DataTypes.STRING(25), allowNull: true }, //For Future purposes
        building: { type: DataTypes.STRING(25), allowNull: false },

        floorLevel: { type: DataTypes.INTEGER, allowNull: false },

        roomNumber: { type: DataTypes.INTEGER, allowNull: false },

        

        isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
            
        isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false }   
    };

    const options = {
        // disable default timestamp fields (createdAt and updatedAt)
        timestamps: true, 
        defaultScope: {
        },
        scopes: {
        }        
    };

    return sequelize.define('roominfo', attributes, options);
}