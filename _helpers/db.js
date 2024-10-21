require("dotenv").config();
const mysql = require("mysql2/promise");
const {Sequelize} = require("sequelize");
const defineRelationships = require("./relationship");

const setupAccounts = require("./accounts-setup");
const InsertSampleData = require("./sample_data");

module.exports = db = {};

initialize();

async function initialize() {
  let dbConfig;

  if (process.env.NODE_ENV && process.env.NODE_ENV === "production") {
    // Use production database configuration
    dbConfig = {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      name: process.env.DB_NAME,
    };
  } else {
    // Use local database configuration
    dbConfig = {
      host: process.env.LOCAL_DB_HOST,
      port: process.env.LOCAL_DB_PORT,
      user: process.env.LOCAL_DB_USER,
      password: process.env.LOCAL_DB_PASSWORD,
      name: process.env.LOCAL_DB_NAME,
    };
  }

  // create db if it doesn't already exist
  const connection = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
  });
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.name}\`;`);

  // connect to db
  const sequelize = new Sequelize(
    dbConfig.name,
    dbConfig.user,
    dbConfig.password,
    {
      host: dbConfig.host,
      dialect: "mysql",
    }
  );

  // Make sure to select the database
  await connection.query(`USE \`${dbConfig.name}\`;`);

  // Assign sequelize to the db object so it can be used globally
  db.sequelize = sequelize; // <-- Add this line

  // Init models and add them to the exported db object
  // ! Account
  db.Account = require("../accounts/account.model")(sequelize);
  db.RefreshToken = require("../accounts/refresh-token.model")(sequelize);

  // ! History Activity Log
  db.History = require("../models/history.model")(sequelize);

  // ! Campus
  db.Campus = require("../models/campus.model")(sequelize);

  // ! Semester
  db.Semester = require("../models/semester.model")(sequelize);

  // ! Department
  db.Department = require("../models/department.model")(sequelize);
  // ! Program
  db.Program = require("../models/programs.model")(sequelize);
  // ! Course Info
  db.CourseInfo = require("../models/course_info.model")(sequelize);
  // ! Building Structure
  db.BuildingStructure = require("../models/building_structure.model")(
    sequelize
  );

  // ! Employee
  db.Employee = require("../models/employee.model")(sequelize);

  // ! Applicant
  db.Applicant = require("../models/student/applicant.model")(sequelize);

  // ! Student
  db.StudentPersonalData = require("../models/student/student_personal_data.model")(sequelize)
  db.StudentAddPersonalData = require("../models/student/student_add_personal_data.model")(sequelize)
  db.StudentFamily = require("../models/student/student_family.model")(sequelize)
  db.StudentAcademicBackground = require("../models/student/student_academic_background.model")(sequelize)
  db.StudentAcademicHistory = require("../models/student/student_academic_history.model")(sequelize)
  db.StudentSubjects = require("../models/student/student_subject.model")(sequelize)

  // ! Enrollment
  db.EnrollmentProcess = require("../models/student/enrollment_process.model")(
    sequelize
  );

  // ! Student Official 
  db.StudentOfficial = require("../models/student/students_official.model")(sequelize);


  // ! Class
  db.Class = require("../models/class.model")(sequelize);

  // ! Prospectus
  db.Prospectus = require("../models/prospectus.model")(sequelize);

  // ! Prospectus Subject
  db.ProspectusSubject = require("../models/prospectus_subjects.model")(
    sequelize
  );

  // ! Pre Requisite
  db.PreRequisite = require("../models/prospectus_pre_requisite.model")(sequelize);

  // define relationships using the imported function
  defineRelationships(db);

  // sync all models with database
  await sequelize.sync(); // Ensure tables are created

  // Check if the unique constraint already exists before adding it
  const [result] = await connection.query(`
    SHOW INDEX FROM student_official WHERE Key_name = 'unique_student_per_campus';
  `);

  if (result.length === 0) {
    // If the unique index does not exist, add it
    await connection.query(`
        ALTER TABLE student_official 
        ADD CONSTRAINT unique_student_per_campus UNIQUE (student_id, campus_id);
      `);
  }

  // Setup dummy values
  await InsertSampleData(db);

  // Setup the accounts
  await setupAccounts(db);
}
