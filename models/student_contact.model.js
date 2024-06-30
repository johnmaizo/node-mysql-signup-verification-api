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
        cityAddress: { type: DataTypes.STRING, allowNull: false },
        provinceAddress: { type: DataTypes.STRING, allowNull: false },
        contactNumber: { type: DataTypes.STRING, allowNull: false },
        cityContactNumber: { type: DataTypes.STRING, allowNull: false },
        provinceContactNumber: { type: DataTypes.STRING, allowNull: false },
        email: { type: DataTypes.STRING, allowNull: false, unique: true },
        isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
    };

    const options = {
        timestamps: false,
    };

    return sequelize.define('studentcontact', attributes, options);
}
