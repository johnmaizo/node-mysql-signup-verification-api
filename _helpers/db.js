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
  db.SubjectInfo = require("../models/subjectInfo.model")(sequelize);

  // define relationships using the imported function
  defineRelationships(db);

  // sync all models with database
  await sequelize.sync();
}
