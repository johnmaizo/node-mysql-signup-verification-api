const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        student_id: { 
            type: DataTypes.STRING,
            references: {
                model: 'students',
                key: 'student_id'
            }
        },
        
        cityAddress: { type: DataTypes.STRING(35), allowNull: false },
        cityTelNumber: { type: DataTypes.STRING(15), allowNull: true },
        provinceAddress: { type: DataTypes.STRING(95), allowNull: true },
        provinceTelNumber: { type: DataTypes.STRING(15), allowNull: false },

        isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
    };

    const options = {
        timestamps: true,
    };

    return sequelize.define('studentcontact', attributes, options);
}
