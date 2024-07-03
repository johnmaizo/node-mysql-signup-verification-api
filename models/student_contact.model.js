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
        email: { type: DataTypes.STRING, allowNull: false, unique: true },
        contactNumber: { type: DataTypes.STRING(11), allowNull: false},
        cityAddress: { type: DataTypes.STRING, allowNull: false },
        cityTelNumber: { type: DataTypes.STRING, allowNull: true },
        provinceAddress: { type: DataTypes.STRING, allowNull: true },
        provinceTelNumber: { type: DataTypes.STRING, allowNull: false },

        isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
    };

    const options = {
        timestamps: true,
    };

    return sequelize.define('studentcontact', attributes, options);
}
