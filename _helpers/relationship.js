/**
 * Defines the relationships between the tables in the database.
 *
 * This function is called by the db.js file to setup the relationships
 * between the tables in the database. It should be called after all the
 * tables have been created.
 *
 * @param {Object} db - The Sequelize instance to use to define the relationships
 * @return {undefined}
 */
function defineRelationships(db) {
  // define relationships

  // ! Account -> Refresh Token
  db.Account.hasMany(db.RefreshToken, {onDelete: "CASCADE"});
  db.RefreshToken.belongsTo(db.Account);

  // ! Department -> Program
  db.Department.hasMany(db.Program, {foreignKey: "department_id"});
  db.Program.belongsTo(db.Department, {foreignKey: "department_id"});

  // ! Room -> Schedule
  // db.RoomInfo.hasMany(db.Schedule, {foreignKey: "room_id"});
  // db.Schedule.belongsTo(db.RoomInfo, {foreignKey: "room_id"});

  // ! Semester -> Schedule
  // db.Semester.hasMany(db.Schedule, {foreignKey: "semester_id"});
  // db.Schedule.belongsTo(db.Semester, {foreignKey: "semester_id"});

  // ! Campus -> Semester
  db.Campus.hasMany(db.Semester, {foreignKey: "campus_id"});
  db.Semester.belongsTo(db.Campus, {foreignKey: "campus_id"});

  // ! Campus -> Course Info
  db.Campus.hasMany(db.CourseInfo, {foreignKey: "campus_id"});
  db.CourseInfo.belongsTo(db.Campus, {foreignKey: "campus_id"});

  // ! Campus -> Department
  db.Campus.hasMany(db.Department, {foreignKey: "campus_id"});
  db.Department.belongsTo(db.Campus, {foreignKey: "campus_id"});

  // ! Campus -> Building Structure
  db.Campus.hasMany(db.BuildingStructure, {foreignKey: "campus_id"});
  db.BuildingStructure.belongsTo(db.Campus, {foreignKey: "campus_id"});

  // ! Account -> History (Tracking which admin performed which action)
  db.Account.hasMany(db.History, {foreignKey: "accountId"});
  db.History.belongsTo(db.Account, {foreignKey: "accountId"});

  // // ! Account -> Campus
  // db.Account.belongsTo(db.Campus, {foreignKey: "campus_id"});

  // ! Department -> Course Info
  db.Department.hasMany(db.CourseInfo, {foreignKey: "department_id"});
  db.CourseInfo.belongsTo(db.Department, {foreignKey: "department_id"});

  // // ! Employee -> Campus
  // db.Employee.belongsTo(db.Campus, {foreignKey: "campus_id"});

  // ! Employee -> Account
  db.Employee.hasOne(db.Account, {
    foreignKey: "employee_id",
    onDelete: "CASCADE",
  });
  db.Account.belongsTo(db.Employee, {foreignKey: "employee_id"});

  // ! Department -> Employee
  db.Department.hasMany(db.Employee, {foreignKey: "department_id"});
  db.Employee.belongsTo(db.Department, {foreignKey: "department_id"});

  // ! Campus -> Employee
  db.Campus.hasMany(db.Employee, {foreignKey: "campus_id"});
  db.Employee.belongsTo(db.Campus, {foreignKey: "campus_id"});

  // ! Campus -> Applicant
  db.Campus.hasMany(db.StudentPersonalData, {foreignKey: "campus_id"});
  db.StudentPersonalData.belongsTo(db.Campus, {foreignKey: "campus_id"});

  // ! For Class below
  // ! Course Info -> Class
  /*
  db.CourseInfo.hasMany(db.Class, {foreignKey: "course_id"});
  db.Class.belongsTo(db.CourseInfo, {foreignKey: "course_id"});

  // ! Semester -> Class
  db.Semester.hasMany(db.Class, {foreignKey: "semester_id"});
  db.Class.belongsTo(db.Semester, {foreignKey: "semester_id"});

  // ! Employee -> Class
  db.Employee.hasMany(db.Class, {foreignKey: "employee_id"});
  db.Class.belongsTo(db.Employee, {foreignKey: "employee_id"});
  */

  // ! Program -> Prospectus
  db.Program.hasMany(db.Prospectus, {foreignKey: "program_id"});
  db.Prospectus.belongsTo(db.Program, {foreignKey: "program_id"});

  // ! Prospectus -> Prospectus Subject
  db.Prospectus.hasMany(db.ProspectusSubject, {foreignKey: "prospectus_id"});
  db.ProspectusSubject.belongsTo(db.Prospectus, {foreignKey: "prospectus_id"});

  // ! Course Info -> Prospectus Subject
  db.CourseInfo.hasMany(db.ProspectusSubject, {
    foreignKey: "course_id",
    as: "ProspectusSubjects",
  });
  db.ProspectusSubject.belongsTo(db.CourseInfo, {
    foreignKey: "course_id",
    as: "CourseInfo",
  });

  // ! Prospectus Subject -> Pre Requisite
  db.ProspectusSubject.hasMany(db.PreRequisite, {
    foreignKey: "prospectus_subject_id",
  });
  db.PreRequisite.belongsTo(db.ProspectusSubject, {
    foreignKey: "prospectus_subject_id",
  });

  // ! Course Info -> Pre Requisite
  db.CourseInfo.hasMany(db.PreRequisite, {foreignKey: "course_id"});
  db.PreRequisite.belongsTo(db.CourseInfo, {foreignKey: "course_id"});

  // Relationships for the new tables:

  // ! Campus -> Student Official
  db.Campus.hasMany(db.StudentOfficial, {foreignKey: "campus_id"});
  db.StudentOfficial.belongsTo(db.Campus, {foreignKey: "campus_id"});

  // ! StudentPersonalData -> Enrollment Process
  db.StudentPersonalData.hasMany(db.EnrollmentProcess, {
    foreignKey: "student_personal_id",
  });
  db.EnrollmentProcess.belongsTo(db.StudentPersonalData, {
    foreignKey: "student_personal_id",
  });

  // EnrollmentProcess -> Semester
  db.EnrollmentProcess.belongsTo(db.Semester, {
    foreignKey: "semester_id",
  });
  db.Semester.hasMany(db.EnrollmentProcess, {
    foreignKey: "semester_id",
  });

  // ! StudentPersonalData -> StudentAddPersonalData (1-to-1)
  db.StudentPersonalData.hasOne(db.StudentAddPersonalData, {
    foreignKey: "student_personal_id",
    as: "addPersonalData",
  });
  db.StudentAddPersonalData.belongsTo(db.StudentPersonalData, {
    foreignKey: "student_personal_id",
  });

  // ! StudentPersonalData -> StudentFamily (1-to-1)
  db.StudentPersonalData.hasOne(db.StudentFamily, {
    foreignKey: "student_personal_id",
    as: "familyDetails",
  });
  db.StudentFamily.belongsTo(db.StudentPersonalData, {
    foreignKey: "student_personal_id",
  });

  // ! StudentPersonalData -> StudentAcademicBackground (1-to-1)
  db.StudentPersonalData.hasOne(db.StudentAcademicBackground, {
    foreignKey: "student_personal_id",
  });
  db.StudentAcademicBackground.belongsTo(db.StudentPersonalData, {
    foreignKey: "student_personal_id",
  });

  // ! StudentPersonalData -> StudentAcademicHistory (1-to-1)
  db.StudentPersonalData.hasOne(db.StudentAcademicHistory, {
    foreignKey: "student_personal_id",
    as: "academicHistory",
  });
  db.StudentAcademicHistory.belongsTo(db.StudentPersonalData, {
    foreignKey: "student_personal_id",
  });

  // ! StudentPersonalData -> StudentOfficial (1-to-1)
  db.StudentPersonalData.hasOne(db.StudentOfficial, {
    foreignKey: "student_personal_id",
  });
  db.StudentOfficial.belongsTo(db.StudentPersonalData, {
    foreignKey: "student_personal_id",
  });

  // ! StudentPersonalData -> StudetDocuments (1-to-1)
  db.StudentPersonalData.hasOne(db.StudentDocuments, {
    foreignKey: "student_personal_id",
  });
  db.StudentDocuments.belongsTo(db.StudentPersonalData, {
    foreignKey: "student_personal_id",
  });

  // ! StudentAcademicBackground belongsTo Program
  db.StudentAcademicBackground.belongsTo(db.Program, {
    foreignKey: "program_id",
  });
  db.Program.hasMany(db.StudentAcademicBackground, {
    foreignKey: "program_id",
  });

  // ! StudentAcademicBackground belongsTo Semester
  db.StudentAcademicBackground.belongsTo(db.Semester, {
    foreignKey: "semester_id",
  });
  db.Semester.hasMany(db.StudentAcademicBackground, {
    foreignKey: "semester_id",
  });

  // Continue with other existing relationships (omitted for brevity)

  // ! Building Structure -> Classes
  // db.BuildingStructure.hasMany(db.Class, {
  //   foreignKey: "structure_id",
  // });
  // db.Class.belongsTo(db.BuildingStructure, {
  //   foreignKey: "structure_id",
  // });

  // StudentAcademicBackground belongsTo Prospectus
  db.StudentAcademicBackground.belongsTo(db.Prospectus, {
    foreignKey: "prospectus_id",
  });
  db.Prospectus.hasMany(db.StudentAcademicBackground, {
    foreignKey: "prospectus_id",
  });

  // StudentPersonalData has many StudentClassEnrollments
  db.StudentPersonalData.hasMany(db.StudentClassEnrollments, {
    foreignKey: "student_personal_id",
  });
  db.StudentClassEnrollments.belongsTo(db.StudentPersonalData, {
    foreignKey: "student_personal_id",
  });

  // Class has many StudentClassEnrollments
  // db.Class.hasMany(db.StudentClassEnrollments, {
  //   foreignKey: "class_id",
  // });
  // db.StudentClassEnrollments.belongsTo(db.Class, {
  //   foreignKey: "class_id",
  // });
}

module.exports = defineRelationships;
