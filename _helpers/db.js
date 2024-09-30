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
  // ! Program Course
  db.ProgramCourse = require("../models/program_course.model")(sequelize);
  // ! Building Structure
  db.BuildingStructure = require("../models/building_structure.model")(
    sequelize
  );

  // ! Student
  db.Student = require("../models/student.model")(sequelize);
  db.StudentContact = require("../models/student_contact.model")(sequelize);
  db.StudentFamily = require("../models/student_family.model")(sequelize);
  db.StudentCurrentAcademic =
    require("../models/student_current_academic_background.model")(sequelize);
  db.AcademicHistory = require("../models/student_academic_history.model")(
    sequelize
  );
  db.StudentSchoolDetail = require("../models/student_school_detail.model")(
    sequelize
  );
  db.StudentSubject = require("../models/student_subject.model")(sequelize);

  // ! Employee
  db.Employee = require("../models/employee.model")(sequelize);

  // ! Enrollment
  db.EnrollmentProcess = require("../models/enrollment_process.model")(
    sequelize
  );

  // ! Applicant
  db.Applicant = require("../models/applicant.model")(sequelize);

  // ! Simple Official Student Basic
  db.StudentOfficalBasic = require("../models/student_official_basic.model")(
    sequelize
  );

  // define relationships using the imported function
  defineRelationships(db);

  // sync all models with database
  await sequelize.sync(); // Ensure tables are created

  // Check if the unique constraint already exists before adding it
  const [result] = await connection.query(`
    SHOW INDEX FROM studentofficalbasic WHERE Key_name = 'unique_student_per_campus';
  `);

  if (result.length === 0) {
    // If the unique index does not exist, add it
    await connection.query(`
        ALTER TABLE studentofficalbasic 
        ADD CONSTRAINT unique_student_per_campus UNIQUE (student_id, campus_id);
      `);
  }

  // Setup dummy values
  await InsertSampleData(db);

  // Setup the accounts
  await setupAccounts(db);
}
