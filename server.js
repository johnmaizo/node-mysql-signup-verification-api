require("rootpath")();
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const errorHandler = require("_middleware/error-handler");
const dotenv = require("dotenv");

dotenv.config();

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cookieParser());

// List of allowed origins for both production and development
const allowedOrigins = [
  "https://misbenedictocollege.netlify.app", // Production frontend
  "http://localhost:5173", // Development frontend
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps, curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  })
);

const {
  fetchDepartmentCountJob,
  getDepartmentCountData,
} = require("./cron-jobs/departmentCron");
fetchDepartmentCountJob(); // Start the cron job

// Add a new route for fetching department count and next update time
app.get("/departments/cron-count", getDepartmentCountData);

app.use("/external", require("./_external/externals.controller")); // ! Externals

// api routes
// ! Employee
app.use("/employee", require("./employee/employees.controller"));

// ! Accounts
app.use("/accounts", require("./accounts/accounts.controller"));

// ! Semester
app.use("/semesters", require("./semester/semesters.controller"));

// ! Campus
app.use("/campus", require("./campus/campuses.controller"));

// ! Department
app.use("/departments", require("./departments/departments.controller"));

// ! Programs
app.use("/programs", require("./program/programs.controller"));

// ! Course Info
app.use("/course", require("./course/courses.controller"));

// ! Building Structure
app.use(
  "/building-structure",
  require("./buildingStructure/buildingstructures.controller")
);

// ! Enrollment Student
app.use("/enrollment", require("./enrollment/enrollments.controller"));

// ! Class
app.use("/class", require("./class/classes.controller"));

// ! Prospectus
app.use("/prospectus", require("./prospectus/prospectuses.controller"));

// ! Student
// app.use("/students", require("./students/students.controller"));

// swagger docs route
app.use("/api-docs", require("_helpers/swagger"));

// global error handler
app.use(errorHandler);

// start server
const port =
  process.env.NODE_ENV === "production" ? process.env.PORT || 80 : 4000;
app.listen(port, () => console.log("Server listening on port " + port));
