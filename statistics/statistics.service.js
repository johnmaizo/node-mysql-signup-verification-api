const {Op, where, col, fn, literal} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");
const redis = require("_helpers/redisClient");

const axios = require("axios");
const moment = require("moment"); // For time formatting
const {Parser} = require("json2csv");

const SCHEDULING_API_URL = process.env.SCHEDULING_API_URL;

module.exports = {
  getTotalEnrollments,
  getEnrollmentsByDepartment,
  getEnrollmentsBySubject,
  getEnrollmentStatusBreakdown,
  getGenderDistribution,
  getEnrollmentTrendsBySemester,
  exportEnrollments,
};

// Helper function to get cached data or fetch and cache it
async function getCachedData(key, fetchFunction, ttl = 60) {
  try {
    const cachedData = await redis.get(key);
    if (cachedData) {
      return JSON.parse(cachedData);
    } else {
      const data = await fetchFunction();
      await redis.set(key, JSON.stringify(data), "EX", ttl);
      return data;
    }
  } catch (error) {
    console.error(`Error fetching cached data for key ${key}:`, error);
    // Fallback to fetching data directly if Redis fails
    return await fetchFunction();
  }
}

// Fetch and cache classes
async function getCachedClasses() {
  return getCachedData(
    "classes",
    async () => {
      const response = await axios.get(
        `${SCHEDULING_API_URL}/teachers/all-subjects`
      );
      return response.data;
    },
    60 // Cache for 60 seconds
  );
}

// Fetch and cache course info
async function getCachedCourseInfo() {
  return getCachedData(
    "courseInfo",
    async () => {
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
      return courses.map((course) => course.toJSON());
    },
    60 // Cache for 60 seconds
  );
}

// Fetch and cache semesters
async function getCachedSemesters() {
  return getCachedData(
    "semesters",
    async () => {
      const semesters = await db.Semester.findAll({
        attributes: ["semester_id", "semesterName"],
      });
      return semesters.map((sem) => sem.toJSON());
    },
    60 // Cache for 60 seconds
  );
}

// Helper function to get filtered classes
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

// Enrich classes with course data
async function enrichClassesWithCourseData(classes) {
  const subjectIds = [...new Set(classes.map((cls) => cls.subject_id))];

  const courses = await getCachedCourseInfo();

  // Map course_id to course info
  const courseIdToInfo = {};
  courses.forEach((course) => {
    if (subjectIds.includes(course.course_id)) {
      courseIdToInfo[course.course_id] = {
        campus_id: course.campus_id,
        department_id: course.department_id,
        departmentName: course.Department
          ? course.Department.departmentName
          : null,
        courseCode: course.courseCode,
        courseDescription: course.courseDescription,
      };
    }
  });

  classes.forEach((cls) => {
    const courseInfo = courseIdToInfo[cls.subject_id];
    if (courseInfo) {
      cls.campus_id = courseInfo.campus_id || null;
      cls.department_id = courseInfo.department_id || null;
      cls.departmentName = courseInfo.departmentName || null;
      cls.courseCode = courseInfo.courseCode || null;
      cls.courseDescription = courseInfo.courseDescription || null;
    } else {
      cls.campus_id = null;
      cls.department_id = null;
      cls.departmentName = null;
      cls.courseCode = null;
      cls.courseDescription = null;
    }
  });

  return classes;
}

// Function implementations

async function getTotalEnrollments(
  campus_id = null,
  schoolYear = null,
  semester_id = null
) {
  try {
    const classes = await getFilteredClasses(
      campus_id,
      schoolYear,
      semester_id
    );

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
  } catch (error) {
    console.error("Error in getTotalEnrollments:", error);
    throw new Error("Failed to get total enrollments");
  }
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
  try {
    // Fetch and filter classes
    let classes = await getFilteredClasses(campus_id, schoolYear, semester_id);

    if (classes.length === 0) {
      return [];
    }

    // Enrich classes with department data
    await enrichClassesWithDepartmentData(classes);

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
        const deptCode = classDetail.departmentCode || "GS"; // Ensure departmentCode is available
        const deptName = classDetail.departmentName || "General Subject";

        if (!enrollmentCounts[deptId]) {
          enrollmentCounts[deptId] = {
            department_id: deptId,
            departmentCode: deptCode,
            departmentName: deptName,
            totalEnrollments: 0,
          };
        }
        enrollmentCounts[deptId].totalEnrollments += 1;
      }
    });

    return Object.values(enrollmentCounts);
  } catch (error) {
    console.error("Error in getEnrollmentsByDepartment:", error);
    throw new Error("Failed to get enrollments by department");
  }
}

async function enrichClassesWithDepartmentData(classes) {
  // Get all unique subject_ids from classes
  const subjectIds = [...new Set(classes.map((cls) => cls.subject_id))];

  // Fetch CourseInfo records with associated Department
  const courseInfos = await db.CourseInfo.findAll({
    where: {
      course_id: {
        [Op.in]: subjectIds,
      },
    },
    include: [
      {
        model: db.Department,
        attributes: ["department_id", "departmentName", "departmentCode"],
      },
    ],
  });

  // Create a map of course_id to CourseInfo
  const courseInfoMap = {};
  courseInfos.forEach((courseInfo) => {
    courseInfoMap[courseInfo.course_id] = courseInfo;
  });

  // Enrich classes with department data
  classes.forEach((cls) => {
    const courseInfo = courseInfoMap[cls.subject_id];
    if (courseInfo) {
      cls.department_id = courseInfo.department_id || null;
      cls.departmentName =
        courseInfo.department?.departmentName || "General Subject";
      cls.departmentCode =
        courseInfo.department?.departmentCode || "GS";
    } else {
      // If no CourseInfo found, assign 'General Subject'
      cls.department_id = null;
      cls.departmentName = "General Subject";
      cls.departmentCode = "GS";
    }
  });
}

async function getEnrollmentsBySubject(
  campus_id = null,
  schoolYear = null,
  semester_id = null
) {
  try {
    // Step 1: Fetch and Filter Classes
    const classes = await getFilteredClasses(
      campus_id,
      schoolYear,
      semester_id
    );

    if (classes.length === 0) {
      console.log("No classes found for the given filters.");
      return [];
    }

    const classIds = classes.map((cls) => cls.id);

    // Step 2: Fetch Unique Student Enrollments per Course
    const enrollments = await db.StudentClassEnrollments.findAll({
      attributes: ["class_id", "student_personal_id"],
      where: {
        class_id: {
          [Op.in]: classIds,
        },
        status: "enrolled", // Adjust if 'enlisted' should also be included
      },
      raw: true, // Fetch plain objects
    });

    if (enrollments.length === 0) {
      console.log("No enrollments found for the filtered classes.");
      return [];
    }

    // Debugging: Log fetched enrollments
    console.log("Fetched Enrollments:", enrollments);

    // Step 3: Map Class IDs to Subject IDs
    const classIdToSubjectId = {};
    classes.forEach((cls) => {
      classIdToSubjectId[cls.id] = cls.subject_id;
    });

    // Step 4: Fetch Course Info from Cache
    const courses = await getCachedCourseInfo();

    // Map course_id to course info
    const courseInfoMap = {};
    courses.forEach((course) => {
      courseInfoMap[course.course_id] = {
        courseCode: course.courseCode,
        courseDescription: course.courseDescription,
      };
    });

    // Step 5: Aggregate Unique Students per Subject
    const enrollmentCounts = {};
    const othersStudentIds = new Set(); // To collect "Others" student IDs

    enrollments.forEach((enrollment) => {
      const subjectId = classIdToSubjectId[enrollment.class_id];
      const studentId = enrollment.student_personal_id;
      if (subjectId && studentId) {
        const courseInfo = courseInfoMap[subjectId];

        if (courseInfo) {
          if (!enrollmentCounts[subjectId]) {
            enrollmentCounts[subjectId] = {
              course_id: subjectId,
              courseCode: courseInfo.courseCode,
              courseDescription: courseInfo.courseDescription,
              uniqueStudents: new Set(),
            };
          }
          enrollmentCounts[subjectId].uniqueStudents.add(studentId);
        }
      }
    });

    // Convert Sets to Counts
    const enrollmentCountsArray = Object.values(enrollmentCounts).map(
      (subject) => ({
        course_id: subject.course_id,
        courseCode: subject.courseCode,
        courseDescription: subject.courseDescription,
        uniqueStudents: subject.uniqueStudents.size,
        studentIds: subject.uniqueStudents, // Include student IDs for "Others"
      })
    );

    // Step 6: Sort and Aggregate Top 3 and Others
    const sortedData = [...enrollmentCountsArray].sort(
      (a, b) => b.uniqueStudents - a.uniqueStudents
    );

    // Select the top 3 subjects
    const topCourses = sortedData.slice(0, 3);

    // Aggregate the remaining subjects into "Others"
    const others = sortedData.slice(3);

    // Collect all student IDs from "Others"
    others.forEach((course) => {
      course.studentIds.forEach((id) => othersStudentIds.add(id));
    });

    // Calculate the total unique students for "Others"
    const othersTotalStudents = othersStudentIds.size;

    // Collect the descriptions and student counts of the courses under "Others"
    const othersDescriptions = others.map(
      (course) =>
        `${course.courseCode} - ${course.courseDescription}: ${course.uniqueStudents}`
    );

    // Prepare the final categories and series data
    const finalCategories = [
      ...topCourses.map((item) => `${item.courseCode}`),
      "Others",
    ];

    const finalUniqueStudents = [
      ...topCourses.map((item) => item.uniqueStudents),
      othersTotalStudents,
    ];

    return {
      categories: finalCategories,
      data: finalUniqueStudents,
      othersDescriptions: othersDescriptions,
    };
  } catch (error) {
    console.error("Error in getEnrollmentsBySubject:", error);
    throw new Error("Failed to get enrollments by subject");
  }
}

async function getEnrollmentStatusBreakdown(
  campus_id = null,
  schoolYear = null,
  semester_id = null
) {
  try {
    const classes = await getFilteredClasses(
      campus_id,
      schoolYear,
      semester_id
    );

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
  } catch (error) {
    console.error("Error in getEnrollmentStatusBreakdown:", error);
    throw new Error("Failed to get enrollment status breakdown");
  }
}

async function getGenderDistribution(
  campus_id = null,
  schoolYear = null,
  semester_id = null
) {
  try {
    // Step 1: Fetch and Filter Classes
    const classes = await getFilteredClasses(
      campus_id,
      schoolYear,
      semester_id
    );

    if (classes.length === 0) {
      console.log("No classes found for the given filters.");
      return [];
    }

    const classIds = classes.map((cls) => cls.id);

    // Step 2: Fetch Unique Student Personal IDs
    const uniqueEnrollments = await db.StudentClassEnrollments.findAll({
      attributes: [[col("student_personal_id"), "student_personal_id"]],
      where: {
        class_id: {
          [Op.in]: classIds,
        },
        status: "enrolled", // Adjust if 'enlisted' should also be included
      },
      group: ["student_personal_id"],
      raw: true,
    });

    if (uniqueEnrollments.length === 0) {
      console.log("No unique enrollments found.");
      return [];
    }

    // Debugging: Log unique enrollments
    console.log("Unique Enrollments:", uniqueEnrollments);

    // Extract unique student_personal_ids
    const uniqueStudentIds = uniqueEnrollments.map(
      (enrollment) => enrollment.student_personal_id
    );

    // Step 3: Aggregate Genders
    const genders = await db.StudentPersonalData.findAll({
      attributes: ["gender", [fn("COUNT", col("gender")), "count"]],
      where: {
        student_personal_id: {
          [Op.in]: uniqueStudentIds,
        },
      },
      group: ["gender"],
      raw: true,
    });

    // Debugging: Log aggregated genders
    console.log("Aggregated Genders:", genders);

    // Format the result
    const genderDistribution = genders.map((record) => ({
      gender: record.gender || "Unspecified",
      count: parseInt(record.count, 10),
    }));

    // Debugging: Log final gender distribution
    console.log("Final Gender Distribution:", genderDistribution);

    return genderDistribution;
  } catch (error) {
    console.error("Error in getGenderDistribution:", error);
    throw new Error("Failed to get gender distribution");
  }
}

async function getEnrollmentTrendsBySemester(campus_id = null) {
  try {
    // Step 1: Fetch and Enrich Classes
    let classes = await getCachedClasses();

    // Enrich classes with course data
    classes = await enrichClassesWithCourseData(classes);

    // Debugging: Log campus_id type and value
    console.log("Received campus_id:", campus_id, "Type:", typeof campus_id);

    // Convert campus_id to number if it's provided
    if (campus_id !== null) {
      const campusIdNum = Number(campus_id);
      if (isNaN(campusIdNum)) {
        throw new Error("Invalid campus_id. It must be a number.");
      }
      classes = classes.filter((cls) => cls.campus_id === campusIdNum);
    }

    // Debugging: Log number of classes after filtering
    console.log(
      `Number of classes after filtering by campus_id=${campus_id}:`,
      classes.length
    );

    // Extract class IDs
    const classIds = classes.map((cls) => cls.id);

    if (classIds.length === 0) {
      return [];
    }

    // Step 2: Fetch Student Enrollments
    const enrollments = await db.StudentClassEnrollments.findAll({
      attributes: ["student_personal_id", "class_id"],
      where: {
        class_id: {
          [Op.in]: classIds,
        },
        status: "enrolled", // Adjust if 'enlisted' should also be included
      },
      raw: true, // Fetch plain objects
    });

    if (enrollments.length === 0) {
      return [];
    }

    // Debugging: Log fetched enrollments
    console.log("Fetched Enrollments:", enrollments);

    // Step 3: Map Class IDs to Semester and School Year
    const classIdToSemesterYear = {};
    classes.forEach((cls) => {
      classIdToSemesterYear[cls.id] = {
        semester_id: cls.semester_id,
        school_year: cls.school_year,
      };
    });

    // Debugging: Log classId to semester-year mapping
    console.log("Class ID to Semester-Year Mapping:", classIdToSemesterYear);

    // Step 4: Fetch Semester Names
    const semesters = await getCachedSemesters();

    // Create a map from semester_id to semesterName
    const semesterIdToName = {};
    semesters.forEach((sem) => {
      semesterIdToName[sem.semester_id] = sem.semesterName;
    });

    // Debugging: Log semester_id to semesterName mapping
    console.log("Semester ID to Name Mapping:", semesterIdToName);

    // Step 5: Aggregate Unique Student Enrollments by Semester
    const trendsMap = {}; // { '2023-2024 - Fall': Set { studentId1, ... }, ... }

    enrollments.forEach((enrollment) => {
      const {class_id, student_personal_id} = enrollment;
      const semesterYear = classIdToSemesterYear[class_id];

      if (semesterYear) {
        const {semester_id, school_year} = semesterYear;
        const semesterName =
          semesterIdToName[semester_id] || `Semester ${semester_id}`;
        const key = `${school_year} - ${semesterName}`;

        if (!trendsMap[key]) {
          trendsMap[key] = new Set();
        }

        trendsMap[key].add(student_personal_id);
      }
    });

    // Debugging: Log trendsMap before converting to array
    console.log("Trends Map:", trendsMap);

    // Step 6: Convert trendsMap to Array with Counts
    const trends = Object.keys(trendsMap).map((key) => ({
      semester: key,
      totalStudents: trendsMap[key].size,
    }));

    // Optional: Sort the trends by school_year and semester
    trends.sort((a, b) => {
      const [yearA, semA] = a.semester.split(" - ");
      const [yearB, semB] = b.semester.split(" - ");

      if (yearA === yearB) {
        return semA.localeCompare(semB);
      }
      return yearA.localeCompare(yearB);
    });

    // Debugging: Log final trends
    console.log("Final Trends:", trends);

    return trends;
  } catch (error) {
    console.error("Error in getEnrollmentTrendsBySemester:", error);
    throw new Error("Failed to get enrollment trends by semester");
  }
}

async function exportEnrollments(filters) {
  try {
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
  } catch (error) {
    console.error("Error in exportEnrollments:", error);
    throw new Error("Failed to export enrollments");
  }
}

async function getEnrollmentData(filters) {
  const {campus_id, schoolYear, semester_id} = filters;

  try {
    const classes = await getFilteredClasses(
      campus_id,
      schoolYear,
      semester_id
    );

    if (classes.length === 0) {
      return [];
    }

    const classIds = classes.map((cls) => cls.id);

    // Fetch enrollments for those class IDs
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

    // Prepare data for export
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
  } catch (error) {
    console.error("Error in getEnrollmentData:", error);
    throw new Error("Failed to get enrollment data");
  }
}
