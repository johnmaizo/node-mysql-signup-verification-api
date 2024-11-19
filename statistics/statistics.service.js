const {Op, where, col, fn, literal} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

const deepEqual = require("deep-equal");

const {default: axios} = require("axios");
const moment = require("moment"); // For time formatting
const {Parser} = require("json2csv");

const SCHEDULING_API_URL = process.env.SCHEDULING_API_URL;

// Caching for external API data and database queries
let classCache = {
  data: null,
  timestamp: null,
  ttl: 60000, // Cache for 1 minute
};

let courseInfoCache = {
  data: null,
  timestamp: null,
  ttl: 60000, // Cache for 1 minute
};

let semesterCache = {
  data: null,
  timestamp: null,
  ttl: 60000,
};

module.exports = {
  getTotalEnrollments,
  getEnrollmentsByDepartment,
  getEnrollmentsBySubject,
  getEnrollmentStatusBreakdown,
  getGenderDistribution,
  getEnrollmentTrendsBySemester,
  exportEnrollments,
};

async function getCachedClasses() {
  const now = Date.now();
  if (classCache.data && now - classCache.timestamp < classCache.ttl) {
    return classCache.data;
  } else {
    // Fetch classes from external API
    const response = await axios.get(
      `${SCHEDULING_API_URL}/teachers/all-subjects`
    );
    let classes = response.data;
    classCache.data = classes;
    classCache.timestamp = now;
    return classes;
  }
}

async function getCachedCourseInfo() {
  const now = Date.now();
  if (
    courseInfoCache.data &&
    now - courseInfoCache.timestamp < courseInfoCache.ttl
  ) {
    return courseInfoCache.data;
  } else {
    const courses = await db.CourseInfo.findAll({
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
          attributes: ["department_id", "departmentName"],
        },
      ],
    });
    courseInfoCache.data = courses;
    courseInfoCache.timestamp = now;
    return courses;
  }
}

async function getCachedSemesters() {
  const now = Date.now();
  if (semesterCache.data && now - semesterCache.timestamp < semesterCache.ttl) {
    return semesterCache.data;
  } else {
    const semesters = await db.Semester.findAll({
      attributes: ["semester_id", "semesterName"],
    });
    semesterCache.data = semesters;
    semesterCache.timestamp = now;
    return semesters;
  }
}

async function getFilteredClasses(campus_id, schoolYear, semester_id) {
  // Fetch classes from cache or external API
  let classes = await getCachedClasses();

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

  return classes;
}

async function getTotalEnrollments(
  campus_id = null,
  schoolYear = null,
  semester_id = null
) {
  // Fetch filtered classes
  const classes = await getFilteredClasses(campus_id, schoolYear, semester_id);

  if (classes.length === 0) {
    return 0;
  }

  const classIds = classes.map((cls) => cls.id);

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

async function enrichClassesWithCourseData(classes) {
  const subjectIds = [...new Set(classes.map((cls) => cls.subject_id))];

  const courses = await getCachedCourseInfo();

  // Map course_id to campus_id
  const courseIdToCampusId = {};
  courses.forEach((course) => {
    if (subjectIds.includes(course.course_id)) {
      courseIdToCampusId[course.course_id] = course.campus_id;
    }
  });

  classes.forEach((cls) => {
    cls.campus_id = courseIdToCampusId[cls.subject_id] || null;
  });

  return classes;
}

async function getEnrollmentsByDepartment(
  campus_id = null,
  schoolYear = null,
  semester_id = null
) {
  const classes = await getFilteredClasses(campus_id, schoolYear, semester_id);

  if (classes.length === 0) {
    return [];
  }

  const classIds = classes.map((cls) => cls.id);

  const enrollments = await db.StudentClassEnrollments.findAll({
    attributes: ["class_id"],
    where: {
      class_id: {
        [Op.in]: classIds,
      },
      status: "enrolled",
    },
  });

  // Create a map of class_id to class details
  const classDetailsMap = {};
  classes.forEach((cls) => {
    classDetailsMap[cls.id] = cls;
  });

  const enrollmentCounts = {};

  enrollments.forEach((enrollment) => {
    const classDetail = classDetailsMap[enrollment.class_id];
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

async function getEnrollmentsBySubject(
  campus_id = null,
  schoolYear = null,
  semester_id = null
) {
  const classes = await getFilteredClasses(campus_id, schoolYear, semester_id);

  if (classes.length === 0) {
    return [];
  }

  const classIds = classes.map((cls) => cls.id);

  const enrollments = await db.StudentClassEnrollments.findAll({
    attributes: ["class_id"],
    where: {
      class_id: {
        [Op.in]: classIds,
      },
      status: "enrolled",
    },
  });

  // Map class_id to subject_id
  const classIdToSubjectId = {};
  classes.forEach((cls) => {
    classIdToSubjectId[cls.id] = cls.subject_id;
  });

  // Fetch course info from cache
  const courses = await getCachedCourseInfo();

  // Map course_id to course info
  const courseInfoMap = {};
  courses.forEach((course) => {
    courseInfoMap[course.course_id] = {
      courseCode: course.courseCode,
      courseDescription: course.courseDescription,
    };
  });

  const enrollmentCounts = {};

  enrollments.forEach((enrollment) => {
    const subjectId = classIdToSubjectId[enrollment.class_id];
    if (subjectId) {
      const courseInfo = courseInfoMap[subjectId];

      if (courseInfo) {
        if (!enrollmentCounts[subjectId]) {
          enrollmentCounts[subjectId] = {
            course_id: subjectId,
            courseCode: courseInfo.courseCode,
            courseDescription: courseInfo.courseDescription,
            totalEnrollments: 0,
          };
        }
        enrollmentCounts[subjectId].totalEnrollments += 1;
      }
    }
  });

  return Object.values(enrollmentCounts);
}

async function getEnrollmentStatusBreakdown(
  campus_id = null,
  schoolYear = null,
  semester_id = null
) {
  const classes = await getFilteredClasses(campus_id, schoolYear, semester_id);

  if (classes.length === 0) {
    return [];
  }

  const classIds = classes.map((cls) => cls.id);

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

async function getGenderDistribution(
  campus_id = null,
  schoolYear = null,
  semester_id = null
) {
  const classes = await getFilteredClasses(campus_id, schoolYear, semester_id);

  if (classes.length === 0) {
    return [];
  }

  const classIds = classes.map((cls) => cls.id);

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

  return genders.map((gender) => ({
    gender: gender.gender,
    count: parseInt(gender.count, 10),
  }));
}

async function getEnrollmentTrendsBySemester(campus_id = null) {
  try {
    // Fetch classes from cache or external API
    let classes = await getCachedClasses();

    // Enrich classes with course data
    classes = await enrichClassesWithCourseData(classes);

    // Filter classes based on campus_id if provided
    classes = classes.filter((cls) => {
      let match = true;
      if (campus_id) match = match && cls.campus_id == campus_id;
      return match;
    });

    // Extract class IDs
    const classIds = classes.map((cls) => cls.id);

    // If no classes after filtering, return empty array
    if (classIds.length === 0) {
      return [];
    }

    // Fetch enrollment counts per class from the database
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

    // Map class_id to total enrollments
    const classIdToTotalStudents = {};
    enrollments.forEach((enrollment) => {
      classIdToTotalStudents[enrollment.class_id] = parseInt(
        enrollment.get("totalStudents"),
        10
      );
    });

    // Map class_id to semester_id and school_year
    const classIdToSemesterYear = {};
    classes.forEach((cls) => {
      classIdToSemesterYear[cls.id] = {
        semester_id: cls.semester_id,
        school_year: cls.school_year,
      };
    });

    // Fetch semesterNames from cache or db.Semester
    const semesters = await getCachedSemesters();

    // Create a map from semester_id to semesterName
    const semesterIdToName = {};
    semesters.forEach((sem) => {
      semesterIdToName[sem.semester_id] = sem.semesterName;
    });

    // Aggregate enrollments by semester and school year
    const trendsMap = {};

    classIds.forEach((classId) => {
      const {semester_id, school_year} = classIdToSemesterYear[classId] || {};
      if (semester_id && school_year) {
        const semesterName =
          semesterIdToName[semester_id] || `Semester ${semester_id}`;
        const key = `${school_year} - ${semesterName}`;
        const count = classIdToTotalStudents[classId] || 0;
        if (trendsMap[key]) {
          trendsMap[key] += count;
        } else {
          trendsMap[key] = count;
        }
      }
    });

    // Convert trendsMap to array
    const trends = Object.keys(trendsMap).map((key) => ({
      semester: key,
      totalEnrollments: trendsMap[key],
    }));

    return trends;
  } catch (error) {
    console.error("Error in getEnrollmentTrendsBySemester:", error);
    throw error; // Propagate the error to be handled by the caller
  }
}

async function exportEnrollments(filters) {
  // Fetch data based on filters
  const data = await getEnrollmentData(filters);

  // Define fields for CSV
  const fields = [
    "student_id",
    "student_name",
    "class_id",
    "status",
    "enrollment_date",
  ];
  const parser = new Parser({fields});
  const csv = parser.parse(data);

  return csv;
}

async function getEnrollmentData(filters) {
  const {campus_id, schoolYear, semester_id} = filters;

  // Step 1: Get filtered classes
  const classes = await getFilteredClasses(campus_id, schoolYear, semester_id);

  if (classes.length === 0) {
    return [];
  }

  const classIds = classes.map((cls) => cls.id);

  // Step 2: Fetch enrollments for those class IDs
  const enrollments = await db.StudentClassEnrollments.findAll({
    attributes: [
      "student_class_enrollment_id",
      "student_personal_id",
      "class_id",
      "status",
      "createdAt", // Assuming 'createdAt' is the enrollment date
    ],
    where: {
      class_id: {
        [Op.in]: classIds,
      },
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

  // Step 3: Prepare data for export
  const data = enrollments.map((enrollment) => {
    const studentData = enrollment.student_personal_datum;
    const studentOfficial = studentData ? studentData.student_official : null;

    const fullName = `${studentData.firstName} ${
      studentData.middleName ? studentData.middleName + " " : ""
    }${studentData.lastName}${
      studentData.suffix ? ", " + studentData.suffix : ""
    }`;

    return {
      student_id: studentOfficial ? studentOfficial.student_id : null,
      student_name: fullName,
      class_id: enrollment.class_id,
      status: enrollment.status,
      enrollment_date: enrollment.createdAt, // Adjust if your date field is different
    };
  });

  return data;
}
