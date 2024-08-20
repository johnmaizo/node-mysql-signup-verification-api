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


    // ! Semester -> Schedule
    db.Semester.hasMany(db.Schedule, { foreignKey: 'semester_id'});
    db.Schedule.belongsTo(db.Semester, { foreignKey: 'semester_id'});
    
    // ! Semester -> Student Current Academic Background
    db.Semester.hasMany(db.StudentCurrentAcademic, { foreignKey: 'semester_id'});
    db.StudentCurrentAcademic.belongsTo(db.Semester, { foreignKey: 'semester_id'});
    
    // ! Semester -> Student School Detail
    db.Semester.hasMany(db.StudentSchoolDetail, { foreignKey: 'semester_id'});
    db.StudentSchoolDetail.belongsTo(db.Semester, { foreignKey: 'semester_id'});
    
    // ! Campus -> Student
    db.Campus.hasMany(db.Student, { foreignKey: 'campus_id'});
    db.Student.belongsTo(db.Campus, { foreignKey: 'campus_id'});
    
    // ! Campus -> Department
    db.Campus.hasMany(db.Department, { foreignKey: 'campus_id'});
    db.Department.belongsTo(db.Campus, { foreignKey: 'campus_id'});

    // ! Campus -> Room Info
    db.Campus.hasMany(db.RoomInfo, {foreignKey: 'campus_id'});
    db.RoomInfo.belongsTo(db.Campus, {foreignKey: 'campus_id'});
    
    // ! Campus -> Staffs
    db.Campus.hasMany(db.StaffInfo, {foreignKey: 'campus_id'});
    db.StaffInfo.belongsTo(db.Campus, {foreignKey: 'campus_id'});


}

module.exports = defineRelationships;
