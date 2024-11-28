const {Op, where, col, fn, literal} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

const deepEqual = require("deep-equal");

const {default: axios} = require("axios");
require("dotenv").config(); // Ensure environment variables are loaded

const moment = require("moment-timezone");

const SCHEDULING_API_URL = process.env.SCHEDULING_API_URL;

module.exports = {
  getAllClass,
  getTotalStudents,
  getClassById,
};

async function getAllClass(
  campus_id = null,
  schoolYear = null,
  semester_id = null
) {
  let externalClasses;

  try {
    // Step 1: Fetch classes from the external API
    const response = await axios.get(
      `${SCHEDULING_API_URL}/teachers/all-subjects`
    );
    externalClasses = response.data; // Assuming the API returns an array of class objects

    // console.log("\n\n\nexternalClasses:", externalClasses);

    // Step 2: Extract unique subject_ids from the classes
    const subjectIds = [
      ...new Set(externalClasses.map((cls) => cls.subject_id)),
    ];

    // Step 3: Fetch course information along with department and campus details
    const courses = await db.CourseInfo.findAll({
      where: {
        course_id: {
          [Op.in]: subjectIds,
        },
      },
      attributes: [
        "course_id",
        "campus_id",
        "courseCode",
        "courseDescription",
        "department_id",
        "unit", // Ensure 'unit' is included
      ],
      include: [
        {
          model: db.Department,
          attributes: ["departmentCode", "departmentName"],
          include: [
            {
              model: db.Campus,
              attributes: ["campusName"],
            },
          ],
        },
      ],
    });

    // Step 4: Create a mapping from course_id to course information
    const courseIdToInfo = {};
    courses.forEach((course) => {
      courseIdToInfo[course.course_id] = {
        campus_id: course.campus_id,
        courseCode: course.courseCode,
        courseDescription: course.courseDescription,
        unit: course.unit, // Assign 'unit' from db.CourseInfo
        departmentCode: course.department
          ? course.department.departmentCode
          : null,
        departmentName: course.department
          ? course.department.departmentName
          : null,
        fullDepartmentNameWithCampus:
          course.department && course.department.campus
            ? `${course.department.departmentCode} - ${course.department.departmentName} - ${course.department.campus.campusName}`
            : null,
      };
    });

    // Step 5: Enrich each class with course and department information from the mapping
    externalClasses.forEach((cls) => {
      const courseInfo = courseIdToInfo[cls.subject_id];
      cls.campus_id = courseInfo ? courseInfo.campus_id : null;
      cls.courseCode = courseInfo ? courseInfo.courseCode : null;
      cls.courseDescription = courseInfo ? courseInfo.courseDescription : null;
      cls.departmentCode = courseInfo ? courseInfo.departmentCode : null;
      cls.departmentName = courseInfo ? courseInfo.departmentName : null;
      cls.fullDepartmentNameWithCampus = courseInfo
        ? courseInfo.fullDepartmentNameWithCampus
        : null;
      cls.units = courseInfo ? courseInfo.unit : null; // Assign 'units' from db.CourseInfo
      // Optionally, you can remove or ignore 'cls.units' from external API
      // delete cls.units; // Uncomment if you want to remove the original 'units' field
    });

    // Step 6: Filter classes based on campus_id, schoolYear, and semester_id
    // **Modification Start:** Exclude classes without a valid semester_id
    let filteredClasses = externalClasses.filter((cls) => {
      // **Exclude classes with no semester_id**
      if (cls.semester_id == null) {
        return false;
      }

      let match = true;
      if (campus_id) {
        match = match && cls.campus_id == campus_id;
      }
      if (schoolYear) {
        match = match && cls.school_year == schoolYear;
      }
      if (semester_id) {
        match = match && cls.semester_id == semester_id;
      }
      return match;
    });
    // **Modification End**

    // Step 7: Map each class to include the formatted schedule string and course information
    const classesWithSchedule = filteredClasses.map((cls) => {
      // **Retrieve the desired time zone from environment variables**
      const desiredTimeZone = "Asia/Singapore"; // Default to Asia/Singapore if not set

      // Parse the start and end times correctly
      // Since the timestamps are in UTC, use moment.utc() before converting
      const startTime = moment
        .utc(cls.start)
        .tz(desiredTimeZone)
        .format("h:mm A");
      const endTime = moment.utc(cls.end).tz(desiredTimeZone).format("h:mm A");

      const scheduleString = `${cls.day} ${startTime} - ${endTime}`;

      return {
        id: cls.id,
        teacher_id: cls.teacher_id,
        subject_id: cls.subject_id,
        subject_code: cls.courseCode,
        subject: cls.courseDescription,
        semester: cls.semester,
        semester_id: cls.semester_id,
        school_year: cls.school_year,
        teacher: cls.teacher,
        units: cls.units, // Now sourced from db.CourseInfo
        room: cls.room,
        campus_id: cls.campus_id,
        departmentCode: cls.departmentCode,
        departmentName: cls.departmentName,
        fullDepartmentNameWithCampus: cls.fullDepartmentNameWithCampus,
        schedule: scheduleString,
      };
    });

    // Step 8: Collect class IDs for which we need to get enrolled students
    const classIds = classesWithSchedule.map((cls) => cls.id);

    // Step 9: Fetch enrollment counts and students for the classes
    const enrollmentsWithStudents = await db.StudentClassEnrollments.findAll({
      where: {
        class_id: {
          [Op.in]: classIds,
        },
        status: "enrolled",
      },
      include: [
        {
          model: db.StudentPersonalData,
          attributes: ["firstName", "middleName", "lastName", "suffix"],
          include: [
            {
              model: db.StudentOfficial,
              attributes: ["student_id"],
            },
          ],
        },
      ],
    });

    // Step 10: Create a mapping from class_id to student details
    const classIdToStudents = {};
    const classIdToStudentCount = {};

    enrollmentsWithStudents.forEach((enrollment) => {
      const classId = enrollment.class_id;
      const studentData = enrollment.student_personal_datum;
      const studentOfficial = studentData.student_official;

      const fullName = `${studentData.firstName} ${
        studentData.middleName ? studentData.middleName + " " : ""
      }${studentData.lastName}${
        studentData.suffix ? ", " + studentData.suffix : ""
      }`;

      const studentInfo = {
        student_id: studentOfficial.student_id,
        fullName,
      };

      if (!classIdToStudents[classId]) {
        classIdToStudents[classId] = [];
        classIdToStudentCount[classId] = 0;
      }
      classIdToStudents[classId].push(studentInfo);
      classIdToStudentCount[classId]++;
    });

    // Step 11: Add totalStudents and students to each class
    classesWithSchedule.forEach((cls) => {
      cls.totalStudents = classIdToStudentCount[cls.id] || 0;
      cls.students = classIdToStudents[cls.id] || [];
    });

    return classesWithSchedule;
  } catch (error) {
    console.error("Error fetching classes:", error);
    throw new Error("Failed to fetch classes from the external source.");
  }
}

async function getTotalStudents(
  campus_id = null,
  schoolYear = null,
  semester_id = null
) {
  try {
    // Fetch classes from the external API
    const response = await axios.get(
      `${SCHEDULING_API_URL}/teachers/all-subjects`
    );
    let externalClasses = response.data;

    // Extract unique subject_ids from the classes
    const subjectIds = [
      ...new Set(externalClasses.map((cls) => cls.subject_id)),
    ];

    // Fetch course information along with campus details
    const courses = await db.CourseInfo.findAll({
      where: {
        course_id: {
          [Op.in]: subjectIds,
        },
      },
      attributes: ["course_id", "campus_id"],
    });

    // Create a mapping from course_id to campus_id
    const courseIdToCampusId = {};
    courses.forEach((course) => {
      courseIdToCampusId[course.course_id] = course.campus_id;
    });

    // Enrich each class with campus_id from the mapping
    externalClasses.forEach((cls) => {
      cls.campus_id = courseIdToCampusId[cls.subject_id] || null;
    });

    // Filter classes based on campus_id, schoolYear, and semester_id
    const filteredClasses = externalClasses.filter((cls) => {
      let match = true;
      if (campus_id) {
        match = match && cls.campus_id == campus_id;
      }
      if (schoolYear) {
        match = match && cls.school_year == schoolYear;
      }
      if (semester_id) {
        match = match && cls.semester_id == semester_id;
      }
      return match;
    });

    // Collect class IDs for which we need to get enrolled students
    const classIds = filteredClasses.map((cls) => cls.id);

    if (classIds.length === 0) {
      // No classes match the criteria
      return [];
    }

    // Fetch enrollment counts grouped by class_id
    const enrollments = await db.StudentClassEnrollments.findAll({
      attributes: [
        "class_id",
        [fn("COUNT", col("student_class_enrollment_id")), "totalStudents"],
      ],
      where: {
        class_id: {
          [Op.in]: classIds,
        },
        status: "enrolled",
      },
      group: ["class_id"],
    });

    // Create a mapping from class_id to totalStudents
    const classIdToTotalStudents = {};
    enrollments.forEach((enrollment) => {
      classIdToTotalStudents[enrollment.class_id] = parseInt(
        enrollment.get("totalStudents"),
        10
      );
    });

    // Prepare the result array
    const result = classIds.map((classId) => {
      return {
        class_id: classId,
        totalStudents: classIdToTotalStudents[classId] || 0,
      };
    });

    return result;
  } catch (error) {
    console.error("Error fetching total students:", error);
    throw new Error("Failed to fetch total students.");
  }
}

// **New Function to Get Class by ID**
async function getClassById(id) {
  try {
    // Step 1: Fetch the class from the external API by ID
    const response = await axios.get(
      `${SCHEDULING_API_URL}/teachers/schedules/${id}`
    );
    const externalClassData = response.data;

    if (!externalClassData || externalClassData.length === 0) {
      throw new Error(`Class with ID ${id} not found.`);
    }

    const cls = externalClassData[0]; // Assuming the API returns an array

    // Step 2: Fetch course information along with department and campus details
    const course = await db.CourseInfo.findOne({
      where: {
        course_id: cls.subject_id,
      },
      attributes: [
        "course_id",
        "campus_id",
        "courseCode",
        "courseDescription",
        "department_id",
        "unit",
      ],
      include: [
        {
          model: db.Department,
          attributes: ["departmentCode", "departmentName"],
          include: [
            {
              model: db.Campus,
              attributes: ["campusName"],
            },
          ],
        },
      ],
    });

    if (!course) {
      throw new Error(`Course with ID ${cls.subject_id} not found.`);
    }

    // Step 3: Enrich the class with course and department information
    cls.campus_id = course.campus_id;
    cls.courseCode = course.courseCode;
    cls.courseDescription = course.courseDescription;
    cls.departmentCode = course.department
      ? course.department.departmentCode
      : null;
    cls.departmentName = course.department
      ? course.department.departmentName
      : null;
    cls.fullDepartmentNameWithCampus =
      course.department && course.department.campus
        ? `${course.department.departmentCode} - ${course.department.departmentName} - ${course.department.campus.campusName}`
        : null;
    cls.units = course.unit;

    // Step 4: Format the schedule string
    const startTime = moment.utc(cls.start).local().format("h:mm A");
    const endTime = moment.utc(cls.end).local().format("h:mm A");
    const scheduleString = `${cls.day} ${startTime} - ${endTime}`;

    // Step 5: Fetch enrolled students for the class
    const enrollmentsWithStudents = await db.StudentClassEnrollments.findAll({
      where: {
        class_id: cls.id,
        status: "enrolled",
      },
      include: [
        {
          model: db.StudentPersonalData,
          attributes: [
            "firstName",
            "middleName",
            "lastName",
            "suffix",
            "gender",
          ],
          include: [
            {
              model: db.StudentOfficial,
              attributes: ["student_id"],
            },
            {
              model: db.StudentAcademicBackground,
              // as: "student_current_academicbackground",
              attributes: ["yearLevel"],
              include: [
                {
                  model: db.Program,
                  attributes: ["programCode"],
                },
              ],
            },
          ],
        },
      ],
    });

    // Step 6: Prepare the list of enrolled students with additional details
    const students = enrollmentsWithStudents.map((enrollment) => {
      const studentData = enrollment.student_personal_datum;

      const studentOfficial = studentData.student_official;

      const fullName = `${studentData.firstName} ${
        studentData.middleName ? studentData.middleName + " " : ""
      }${studentData.lastName}${
        studentData.suffix ? ", " + studentData.suffix : ""
      }`;

      const gender = studentData.gender;

      // Get academic background details
      const academicBackground = studentData.student_current_academicbackground;
      const programCode = academicBackground
        ? academicBackground.program.programCode
        : null;
      const yearLevel = academicBackground
        ? academicBackground.yearLevel
        : null;

      return {
        student_id: studentOfficial.student_id,
        name: fullName,
        gender: gender,
        program: programCode,
        yearLevel: yearLevel,
      };
    });

    // Step 7: Build the final class data object
    const classData = {
      id: cls.id,
      teacher_id: cls.teacher_id,
      subject_id: cls.subject_id,
      subject_code: cls.courseCode,
      subject: cls.courseDescription,
      semester: cls.semester,
      semester_id: cls.semester_id,
      school_year: cls.school_year,
      teacher: cls.teacher,
      units: cls.units,
      room: cls.room,
      campus_id: cls.campus_id,
      departmentCode: cls.departmentCode,
      departmentName: cls.departmentName,
      fullDepartmentNameWithCampus: cls.fullDepartmentNameWithCampus,
      schedule: scheduleString,
      totalStudents: students.length,
      students: students,
    };

    return classData;
  } catch (error) {
    console.error("Error fetching class by ID:", error.message);
    throw new Error(
      error.response && error.response.status === 404
        ? `Class with ID ${id} not found.`
        : "Failed to fetch class from the external source."
    );
  }
}
