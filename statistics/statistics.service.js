const {Op, where, col, fn, literal} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

const deepEqual = require("deep-equal");

const {default: axios} = require("axios");
const moment = require("moment"); // For time formatting

const SCHEDULING_API_URL = process.env.SCHEDULING_API_URL;

module.exports = {
  getTotalEnrollments,
  getEnrollmentsByDepartment,
  getEnrollmentsBySubject,
  getEnrollmentStatusBreakdown,
  getGenderDistribution,
  //   getTotalStudents,
};

async function getTotalEnrollments(
  campus_id = null,
  schoolYear = null,
  semester_id = null
) {
  // Fetch class IDs from external API based on filters
  const classIds = await getFilteredClassIds(
    campus_id,
    schoolYear,
    semester_id
  );

  if (classIds.length === 0) {
    return 0;
  }

  const totalEnrollments = await db.StudentClassEnrollments.count({
    where: {
      class_id: {
        [Op.in]: classIds,
      },
      status: "enrolled",
    },
  });

  return totalEnrollments;
}

// Helper function to fetch class IDs based on filters
async function getFilteredClassIds(campus_id, schoolYear, semester_id) {
  const response = await axios.get(
    `${SCHEDULING_API_URL}/teachers/all-subjects`
  );
  let classes = response.data;

  // Enrich classes with course and campus data
  classes = await enrichClassesWithCourseData(classes);

  // Apply filters
  classes = classes.filter((cls) => {
    let match = true;
    if (campus_id) match = match && cls.campus_id == campus_id;
    if (schoolYear) match = match && cls.school_year == schoolYear;
    if (semester_id) match = match && cls.semester_id == semester_id;
    return match;
  });

  return classes.map((cls) => cls.id);
}

// Function to enrich classes with course data
async function enrichClassesWithCourseData(classes) {
  const subjectIds = [...new Set(classes.map((cls) => cls.subject_id))];

  const courses = await db.CourseInfo.findAll({
    where: {
      course_id: {
        [Op.in]: subjectIds,
      },
    },
    attributes: ["course_id", "campus_id"],
  });

  const courseIdToCampusId = {};
  courses.forEach((course) => {
    courseIdToCampusId[course.course_id] = course.campus_id;
  });

  classes.forEach((cls) => {
    cls.campus_id = courseIdToCampusId[cls.subject_id] || null;
  });

  return classes;
}

// ! Enrollment by Department

async function getEnrollmentsByDepartment(
  campus_id = null,
  schoolYear = null,
  semester_id = null
) {
  const classIds = await getFilteredClassIds(
    campus_id,
    schoolYear,
    semester_id
  );

  if (classIds.length === 0) {
    return [];
  }

  const enrollments = await db.StudentClassEnrollments.findAll({
    attributes: ["class_id"],
    where: {
      class_id: {
        [Op.in]: classIds,
      },
      status: "enrolled",
    },
  });

  const classDetails = await getClassDetailsByIds(classIds);

  const enrollmentCounts = {};

  enrollments.forEach((enrollment) => {
    const classDetail = classDetails[enrollment.class_id];
    if (classDetail) {
      const deptId = classDetail.department_id || "unassigned";
      const deptName = classDetail.departmentName || "General Subject";

      if (!enrollmentCounts[deptId]) {
        enrollmentCounts[deptId] = {
          department_id: classDetail.department_id,
          departmentName: deptName,
          totalEnrollments: 0,
        };
      }
      enrollmentCounts[deptId].totalEnrollments += 1;
    }
  });

  return Object.values(enrollmentCounts);
}

// ! Enrollments by Coruse

async function getEnrollmentsBySubject(
  campus_id = null,
  schoolYear = null,
  semester_id = null
) {
  // Fetch filtered class IDs based on campus, school year, and semester
  const classIds = await getFilteredClassIds(
    campus_id,
    schoolYear,
    semester_id
  );

  // If no classes are found, return an empty array
  if (classIds.length === 0) {
    return [];
  }

  // Fetch all enrollments for the filtered classes with status "enrolled"
  const enrollments = await db.StudentClassEnrollments.findAll({
    attributes: ["class_id"],
    where: {
      class_id: {
        [Op.in]: classIds,
      },
      status: "enrolled",
    },
  });

  // Fetch class details
  const classDetails = await getClassDetailsByIds(classIds);

  // Extract unique subject_ids
  const subjectIds = [
    ...new Set(Object.values(classDetails).map((detail) => detail.subject_id)),
  ];

  // Fetch all relevant course information in one query
  const courseInfos = await db.CourseInfo.findAll({
    where: {course_id: {[Op.in]: subjectIds}},
    attributes: ["course_id", "courseCode", "courseDescription"],
  });

  // Map course info by course_id for quick access
  const courseInfoMap = courseInfos.reduce((acc, course) => {
    acc[course.course_id] = {
      courseCode: course.courseCode,
      courseDescription: course.courseDescription,
    };
    return acc;
  }, {});

  const enrollmentCounts = {};

  // Tally enrollments per course
  enrollments.forEach((enrollment) => {
    const classDetail = classDetails[enrollment.class_id];
    if (classDetail) {
      const courseId = classDetail.subject_id;
      const courseInfo = courseInfoMap[courseId];

      if (courseInfo) {
        if (!enrollmentCounts[courseId]) {
          enrollmentCounts[courseId] = {
            course_id: courseId,
            courseCode: courseInfo.courseCode,
            courseDescription: courseInfo.courseDescription,
            totalEnrollments: 0,
          };
        }
        enrollmentCounts[courseId].totalEnrollments += 1;
      }
    }
  });

  // Return the enrollment counts as an array
  return Object.values(enrollmentCounts);
}

// ! Enrollment Status Breakdown

async function getEnrollmentStatusBreakdown(
  campus_id = null,
  schoolYear = null,
  semester_id = null
) {
  const classIds = await getFilteredClassIds(
    campus_id,
    schoolYear,
    semester_id
  );

  if (classIds.length === 0) {
    return [];
  }

  const statuses = await db.StudentClassEnrollments.findAll({
    attributes: [
      "status",
      [fn("COUNT", col("student_class_enrollment_id")), "count"],
    ],
    where: {
      class_id: {
        [Op.in]: classIds,
      },
    },
    group: ["status"],
  });

  return statuses.map((status) => ({
    status: status.status,
    count: parseInt(status.get("count"), 10),
  }));
}

// ! Gender Distribution

async function getGenderDistribution(
  campus_id = null,
  schoolYear = null,
  semester_id = null
) {
  const classIds = await getFilteredClassIds(
    campus_id,
    schoolYear,
    semester_id
  );

  if (classIds.length === 0) {
    return [];
  }

  const genders = await db.StudentClassEnrollments.findAll({
    attributes: [
      [col("student_personal_datum.gender"), "gender"],
      [fn("COUNT", col("student_class_enrollment_id")), "count"],
    ],
    where: {
      class_id: {
        [Op.in]: classIds,
      },
      status: "enrolled",
    },
    include: [
      {
        model: db.StudentPersonalData,
        attributes: [],
      },
    ],
    group: ["student_personal_datum.gender"],
    raw: true, // Ensure raw data is returned
  });

  console.log(genders);

  return genders.map((gender) => ({
    gender: gender.gender,
    count: parseInt(gender.count, 10), // Access 'count' directly
  }));
}

// ! vvv OTHER HELPERS vvv

// Helper function to get class details by IDs
async function getClassDetailsByIds(classIds) {
  // Fetch classes from external API
  const response = await axios.get(
    `${SCHEDULING_API_URL}/teachers/all-subjects`,
    {
      params: {class_ids: classIds.join(",")},
    }
  );
  const classes = response.data;

  // Enrich classes with course and department data
  const enrichedClasses = await enrichClassesWithCourseAndDepartmentData(
    classes
  );

  const classDetails = {};
  enrichedClasses.forEach((cls) => {
    classDetails[cls.id] = cls;
  });

  return classDetails;
}

// Function to enrich classes with course and department data
async function enrichClassesWithCourseAndDepartmentData(classes) {
  const subjectIds = [...new Set(classes.map((cls) => cls.subject_id))];

  const courses = await db.CourseInfo.findAll({
    where: {
      course_id: {
        [Op.in]: subjectIds,
      },
    },
    attributes: ["course_id", "department_id"],
    include: [
      {
        model: db.Department,
        attributes: ["department_id", "departmentName"],
      },
    ],
  });

  const courseIdToDept = {};
  courses.forEach((course) => {
    const department = course.Department;
    if (department) {
      courseIdToDept[course.course_id] = {
        department_id: department.department_id,
        departmentName: department.departmentName,
      };
    } else {
      // Handle courses without a department
      courseIdToDept[course.course_id] = {
        department_id: null,
        departmentName: null,
      };
    }
  });

  classes.forEach((cls) => {
    const courseInfo = courseIdToDept[cls.subject_id];
    cls.department_id = courseInfo ? courseInfo.department_id : null;
    cls.departmentName = courseInfo ? courseInfo.departmentName : null;
  });

  return classes;
}
