const config = require("config.json");
const mysql = require("mysql2/promise");
const {Sequelize} = require("sequelize");
const defineRelationships = require("./relationship");

module.exports = db = {};

initialize();

async function initialize() {
  // create db if it doesn't already exist
  const {host, port, user, password, database} = config.database;
  const connection = await mysql.createConnection({host, port, user, password});
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);

  // connect to db
  const sequelize = new Sequelize(database, user, password, {dialect: "mysql"});

  // init models and add them to the exported db object
  db.Account = require("../accounts/account.model")(sequelize);
  db.RefreshToken = require("../accounts/refresh-token.model")(sequelize);

  db.Department = require("../models/department.model")(sequelize);
  db.Course = require("../models/course.model")(sequelize);
  db.SubjectInfo = require("../models/subject_info.model")(sequelize);
  db.RoomInfo = require("../models/room_info.model")(sequelize);

  // ! Student
  db.Student = require("../models/student.model")(sequelize);
  db.StudentContact = require("../models/student_contact.model")(sequelize);
  db.StudentFamily = require("../models/student_family.model")(sequelize);
  db.StudentCurrentAcademic = require("../models/student_current_academic_background.model")(sequelize);
  db.AcademicHistory = require("../models/student_academic_history.model")(sequelize);
  db.StudentSchoolDetail = require("../models/student_school_detail.model")(sequelize);
  db.StudentSubject = require("../models/student_subject.model")(sequelize);

  // ! Schedule
  db.Schedule = require("../models/schedule.model")(sequelize);
  
  // ! Staff
  db.StaffInfo = require("../models/staff.model")(sequelize);

  // define relationships using the imported function
  defineRelationships(db);

  // sync all models with database
  await sequelize.sync();
}
