const {Op, where, col, fn, literal} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

const deepEqual = require("deep-equal");

const {default: axios} = require("axios");
const moment = require("moment"); // For time formatting

const SCHEDULING_API_URL = process.env.SCHEDULING_API_URL;

module.exports = {
  getAllClass,
  getTotalStudents,
};

async function getAllClass(
  campus_id = null,
  schoolYear = null,
  semester_id = null
) {
  let externalClasses;

  try {
    // Fetch classes from the external API
    const response = await axios.get(
      `${SCHEDULING_API_URL}/teachers/all-subjects`
    );
    externalClasses = response.data; // Assuming the API returns an array of class objects

    console.log("\n\n\nexternalClasses:", externalClasses);

    // Extract unique subject_ids from the classes
    const subjectIds = [
      ...new Set(externalClasses.map((cls) => cls.subject_id)),
    ];

    // Fetch course information along with department and campus details
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

    // Create a mapping from course_id to course information
    const courseIdToInfo = {};
    courses.forEach((course) => {
      courseIdToInfo[course.course_id] = {
        campus_id: course.campus_id,
        courseCode: course.courseCode,
        courseDescription: course.courseDescription,
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

    // Enrich each class with course and department information from the mapping
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
    });

    // Filter classes based on campus_id, schoolYear, and semester_id
    let filteredClasses = externalClasses.filter((cls) => {
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

    // Map each class to include the formatted schedule string and course information
    const classesWithSchedule = filteredClasses.map((cls) => {
      const startTime = moment.utc(cls.start).local().format("h:mm A");
      const endTime = moment.utc(cls.end).local().format("h:mm A");
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
        units: cls.units,
        room: cls.room,
        campus_id: cls.campus_id,
        departmentCode: cls.departmentCode,
        departmentName: cls.departmentName,
        fullDepartmentNameWithCampus: cls.fullDepartmentNameWithCampus,
        schedule: scheduleString,
      };
    });

    // Collect class IDs for which we need to get enrolled students
    const classIds = classesWithSchedule.map((cls) => cls.id);

    // Fetch enrollment counts and students for the classes
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

    // Create a mapping from class_id to student details
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

    // Add totalStudents and students to each class
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
