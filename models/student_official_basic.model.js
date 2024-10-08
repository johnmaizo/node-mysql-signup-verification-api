const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        student_id: { 
            type: DataTypes.STRING, 
            allowNull: false, 
        },
        campus_id: { 
            type: DataTypes.INTEGER,
            references: {
                model: 'campuses',
                key: 'campus_id'
            },
            allowNull: false
        },
        firstName: { type: DataTypes.STRING(35), allowNull: false },
        middleName: { type: DataTypes.STRING(35), allowNull: true },
        lastName: { type: DataTypes.STRING(35), allowNull: false },
        suffix: { type: DataTypes.STRING(35), allowNull: true },
        gender: { type: DataTypes.STRING(10), allowNull: false },
        email: { type: DataTypes.STRING, allowNull: false },
        contactNumber: { type: DataTypes.STRING(15), allowNull: false },
        address: { type: DataTypes.STRING, allowNull: false },
        yearLevel: { type: DataTypes.STRING, allowNull: false },
        program: { type: DataTypes.STRING, allowNull: false },
        isTransferee: { type: DataTypes.BOOLEAN, allowNull: false },
        birthDate: { type: DataTypes.DATEONLY, allowNull: false },
        status: { type: DataTypes.STRING(20), allowNull: false },
        isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
        isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false }
    };

    const options = {
        timestamps: true,
        freezeTableName: true,  // Ensure table name remains as defined (no pluralization)
        tableName: 'studentofficalbasic',  // Explicitly set the table name
        indexes: [
            {
                unique: true,
                fields: ['student_id', 'campus_id'] // Add unique constraint here at model level as well
            }
        ]
    };

    return sequelize.define('studentofficalbasic', attributes, options);
}
