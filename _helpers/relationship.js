function defineRelationships(db) {
    // define relationships

    // ! Account
    db.Account.hasMany(db.RefreshToken, { onDelete: 'CASCADE' });
    db.RefreshToken.belongsTo(db.Account);

    // ! Department
    db.Department.hasMany(db.Course, { foreignKey: 'department_id' });
    db.Course.belongsTo(db.Department, { foreignKey: 'department_id' });
    
    db.Course.hasMany(db.SubjectInfo, { foreignKey: 'course_id' });
    db.SubjectInfo.belongsTo(db.Course, { foreignKey: 'course_id' });

    // ! Students
    db.Student.hasMany(db.StudentContact, { foreignKey: 'student_id' });
    db.StudentContact.belongsTo(db.Student, { foreignKey: 'student_id' });

    db.Student.hasMany(db.StudentFamily, { foreignKey: 'student_id' });
    db.StudentFamily.belongsTo(db.Student, { foreignKey: 'student_id' });

    db.Student.hasMany(db.StudentCurrentAcademic, { foreignKey: 'student_id' });
    db.StudentCurrentAcademic.belongsTo(db.Student, { foreignKey: 'student_id' });

    db.Student.hasMany(db.AcademicHistory, { foreignKey: 'student_id' });
    db.AcademicHistory.belongsTo(db.Student, { foreignKey: 'student_id' });

    db.Department.hasMany(db.StudentCurrentAcademic, { foreignKey: 'department_id' });
    db.StudentCurrentAcademic.belongsTo(db.Department, { foreignKey: 'department_id' });

    // ! Room
    db.RoomInfo.hasMany(db.Schedule, { foreignKey: 'room_id' });
    db.Schedule.belongsTo(db.RoomInfo, { foreignKey: 'room_id' });

    // ! Student School Detail
    db.Student.hasMany(db.StudentSchoolDetail, { foreignKey: 'student_id' });
    db.StudentSchoolDetail.belongsTo(db.Student, { foreignKey: 'student_id' });
    db.Course.hasMany(db.StudentSchoolDetail, { foreignKey: 'course_id' });
    db.StudentSchoolDetail.belongsTo(db.Course, { foreignKey: 'course_id' });
    db.Department.hasMany(db.StudentSchoolDetail, { foreignKey: 'department_id' });
    db.StudentSchoolDetail.belongsTo(db.Department, { foreignKey: 'department_id' });


    // ! Student Subject
    db.Student.hasMany(db.StudentSubject, { foreignKey: 'student_id' });
    db.StudentSubject.belongsTo(db.Student, { foreignKey: 'student_id' });
    db.SubjectInfo.hasMany(db.StudentSubject, { foreignKey: 'subject_code' });
    db.StudentSubject.belongsTo(db.SubjectInfo, { foreignKey: 'subject_code' });


    // ! Teacher
    db.Department.hasMany(db.TeacherInfo, { foreignKey: 'department_id' });
    db.TeacherInfo.belongsTo(db.Department, { foreignKey: 'department_id' });


}

module.exports = defineRelationships;
