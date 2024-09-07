function defineRelationships(db) {
  // define relationships

  // ! Account -> Refresh Token
  db.Account.hasMany(db.RefreshToken, {onDelete: "CASCADE"});
  db.RefreshToken.belongsTo(db.Account);

  // ! Department -> Program
  db.Department.hasMany(db.Program, {foreignKey: "department_id"});
  db.Program.belongsTo(db.Department, {foreignKey: "department_id"});

  // ! Program -> Student Current Academic Background
  db.Program.hasMany(db.StudentCurrentAcademic, {foreignKey: "program_id"});
  db.StudentCurrentAcademic.belongsTo(db.Program, {foreignKey: "program_id"});

  // ! Students -> Student Contact
  db.Student.hasMany(db.StudentContact, {foreignKey: "student_id"});
  db.StudentContact.belongsTo(db.Student, {foreignKey: "student_id"});

  // ! Student -> Student Family
  db.Student.hasMany(db.StudentFamily, {foreignKey: "student_id"});
  db.StudentFamily.belongsTo(db.Student, {foreignKey: "student_id"});

  // ! Student -> Student Current Academic
  db.Student.hasMany(db.StudentCurrentAcademic, {foreignKey: "student_id"});
  db.StudentCurrentAcademic.belongsTo(db.Student, {foreignKey: "student_id"});

  // ! Student -> Academic History
  db.Student.hasMany(db.AcademicHistory, {foreignKey: "student_id"});
  db.AcademicHistory.belongsTo(db.Student, {foreignKey: "student_id"});

  // ! Department Student Current Academic
  db.Department.hasMany(db.StudentCurrentAcademic, {
    foreignKey: "department_id",
  });
  db.StudentCurrentAcademic.belongsTo(db.Department, {
    foreignKey: "department_id",
  });

  // ! Room -> Schedule
  db.RoomInfo.hasMany(db.Schedule, {foreignKey: "room_id"});
  db.Schedule.belongsTo(db.RoomInfo, {foreignKey: "room_id"});

  // ! Student -> Students School Details
  db.Student.hasMany(db.StudentSchoolDetail, {foreignKey: "student_id"});
  db.StudentSchoolDetail.belongsTo(db.Student, {foreignKey: "student_id"});

  // ! Program -> Student School Details
  db.Program.hasMany(db.StudentSchoolDetail, {foreignKey: "program_id"});
  db.StudentSchoolDetail.belongsTo(db.Program, {foreignKey: "program_id"});

  // ! Department -> Student School Details
  db.Department.hasMany(db.StudentSchoolDetail, {foreignKey: "department_id"});
  db.StudentSchoolDetail.belongsTo(db.Department, {
    foreignKey: "department_id",
  });

  // ! Program -> Program Course
  db.Program.hasMany(db.ProgramCourse, {foreignKey: "program_id"});
  db.ProgramCourse.belongsTo(db.Program, {foreignKey: "program_id"});

  // ! Course -> Program Course
  db.CourseInfo.hasMany(db.ProgramCourse, {foreignKey: "course_id"});
  db.ProgramCourse.belongsTo(db.CourseInfo, {foreignKey: "course_id"});

  // ! Student -> Student Subject
  db.Student.hasMany(db.StudentSubject, {foreignKey: "student_id"});
  db.StudentSubject.belongsTo(db.Student, {foreignKey: "student_id"});

  // ! Program Course -> Student Subject
  db.ProgramCourse.hasMany(db.StudentSubject, {foreignKey: "programCourse_id"});
  db.StudentSubject.belongsTo(db.ProgramCourse, {
    foreignKey: "programCourse_id",
  });

  // ! Semester -> Schedule
  db.Semester.hasMany(db.Schedule, {foreignKey: "semester_id"});
  db.Schedule.belongsTo(db.Semester, {foreignKey: "semester_id"});

  // ! Semester -> Student Current Academic Background
  db.Semester.hasMany(db.StudentCurrentAcademic, {foreignKey: "semester_id"});
  db.StudentCurrentAcademic.belongsTo(db.Semester, {foreignKey: "semester_id"});

  // ! Semester -> Student School Details
  db.Semester.hasMany(db.StudentSchoolDetail, {foreignKey: "semester_id"});
  db.StudentSchoolDetail.belongsTo(db.Semester, {foreignKey: "semester_id"});

  // ! Campus -> Student
  db.Campus.hasMany(db.Student, {foreignKey: "campus_id"});
  db.Student.belongsTo(db.Campus, {foreignKey: "campus_id"});

  // ! Campus -> Semester
  db.Campus.hasMany(db.Semester, {foreignKey: "campus_id"});
  db.Semester.belongsTo(db.Campus, {foreignKey: "campus_id"});

  // ! Campus -> Course Info
  db.Campus.hasMany(db.CourseInfo, {foreignKey: "campus_id"});
  db.CourseInfo.belongsTo(db.Campus, {foreignKey: "campus_id"});

  // ! Campus -> Department
  db.Campus.hasMany(db.Department, {foreignKey: "campus_id"});
  db.Department.belongsTo(db.Campus, {foreignKey: "campus_id"});

  // ! Campus -> Room Info
  db.Campus.hasMany(db.RoomInfo, {foreignKey: "campus_id"});
  db.RoomInfo.belongsTo(db.Campus, {foreignKey: "campus_id"});

  // ! Account -> History (Tracking which admin performed which action)
  db.Account.hasMany(db.History, {foreignKey: "accountId"});
  db.History.belongsTo(db.Account, {foreignKey: "accountId"});

  // ! Account -> Campus
  db.Account.belongsTo(db.Campus, {foreignKey: "campus_id"});
}

module.exports = defineRelationships;
