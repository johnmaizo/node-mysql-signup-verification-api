function defineRelationships(db) {
    // define relationships

    // Account
    db.Account.hasMany(db.RefreshToken, { onDelete: 'CASCADE' });
    db.RefreshToken.belongsTo(db.Account);

    db.Department.hasMany(db.Course, { foreignKey: 'department_id' });
    db.Course.belongsTo(db.Department, { foreignKey: 'department_id' });
    
    db.Course.hasMany(db.SubjectInfo, { foreignKey: 'course_id' });
    db.SubjectInfo.belongsTo(db.Course, { foreignKey: 'course_id' });
}

module.exports = defineRelationships;
