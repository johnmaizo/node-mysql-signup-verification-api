require("dotenv").config();
const mysql = require("mysql2/promise");
const {Sequelize} = require("sequelize");
const defineRelationships = require("./relationship");

const setupAccounts = require("./accounts-setup");
const InsertSampleData = require("./sample_data");

module.exports = db = {};

initialize();

async function initialize() {
  // create db if it doesn't already exist
  const {DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME} = process.env;
  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
  });
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);

  // connect to db
  const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    dialect: "mysql",
  });

  // Make sure to select the database
  await connection.query(`USE \`${DB_NAME}\`;`);

  // init models and add them to the exported db object
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
