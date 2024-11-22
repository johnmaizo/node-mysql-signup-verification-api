const {Op} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");
const {default: axios} = require("axios");

const SCHEDULING_API_URL = process.env.SCHEDULING_API_URL;

module.exports = {
  addEnrollment,
  getStudentOfficial,
  getStudentById,
  getStudentGrades,
  getUnenrolledStudents,
  updateStudentInformation,
  getStudentPersonalDataById,
};

async function addEnrollment(params, accountId) {
  const {student_personal_id, semester_id} = params;

  // Check if the student exists
  const student = await db.StudentPersonalData.findByPk(student_personal_id);
  if (!student) {
    throw new Error("Student not found.");
  }

  // Check if an EnrollmentProcess already exists for this student and semester
  const existingEnrollmentProcess = await db.EnrollmentProcess.findOne({
    where: {
      student_personal_id,
      semester_id,
    },
  });

  if (existingEnrollmentProcess) {
    throw new Error("Enrollment already exists for this student and semester.");
  }

  // Create a new EnrollmentProcess record
  const newEnrollmentProcess = await db.EnrollmentProcess.create({
    student_personal_id,
    semester_id,
    registrar_status: "accepted", // Initial status
    registrar_status_date: new Date(),
    accounting_status: "upcoming",
    payment_confirmed: false,
    final_approval_status: false,
  });

  // Get the student's academic background
  const academicBackground = await db.StudentAcademicBackground.findOne({
    where: {student_personal_id},
  });

  if (!academicBackground) {
    throw new Error("Student academic background not found.");
  }

  // Define the sequence of year levels
  const yearLevels = ["First Year", "Second Year", "Third Year", "Fourth Year"];

  // Find the index of the current year level
  let currentLevelIndex = yearLevels.indexOf(academicBackground.yearLevel);

  if (currentLevelIndex === -1) {
    throw new Error(`Invalid yearLevel: ${academicBackground.yearLevel}`);
  }

  // Advance to the next year level if not already at the last level
  if (currentLevelIndex < yearLevels.length - 1) {
    academicBackground.yearLevel = yearLevels[currentLevelIndex + 1];
  } else {
    // Optional: Handle the case where the student is already in the Fourth Year
    // For example, keep the yearLevel as "Fourth Year" or handle graduation
    academicBackground.yearLevel = "Graduated";
  }

  // Update the academic background's semester_id
  academicBackground.semester_id = semester_id;
  await academicBackground.save();

  // Log the action
  await db.History.create({
    action: "update",
    entity: "StudentAcademicBackground",
    entityId: academicBackground.id,
    changes: {
      semester_id,
      yearLevel: academicBackground.yearLevel,
    },
    accountId,
  });

  // Log the creation of the new enrollment process
  await db.History.create({
    action: "create",
    entity: "EnrollmentProcess",
    entityId: newEnrollmentProcess.enrollment_id,
    changes: {semester_id},
    accountId,
  });

  return;
}

async function getStudentOfficial(student_personal_id) {
  const studentOfficial = await db.StudentOfficial.findOne({
    where: {student_personal_id},
  });
  if (!studentOfficial) {
    throw new Error("Student official record not found.");
  }
  return studentOfficial;
}

async function getStudentById(student_id, campus_id) {
  try {
    // Fetch the student along with necessary associations, excluding db.Class
    const student = await db.StudentOfficial.findOne({
      where: {student_id, campus_id},
      include: [
        {
          model: db.StudentPersonalData,
          include: [
            {model: db.StudentAddPersonalData, as: "addPersonalData"},
            {model: db.StudentFamily, as: "familyDetails"},
            {
              model: db.StudentAcademicBackground,
              include: [
                {
                  model: db.Program,
                  include: [
                    {
                      model: db.Department,
                    },
                  ],
                },
                {
                  model: db.Semester,
                },
              ],
            },
            {model: db.StudentAcademicHistory, as: "academicHistory"},
            {model: db.StudentDocuments, as: "student_document"},
            {
              model: db.StudentClassEnrollments,
              include: [
                // Remove db.Class from includes
                // We'll handle class details using the external API
              ],
            },
          ],
        },
        {
          model: db.Campus,
        },
      ],
    });

    if (!student) {
      throw new Error("Student not found");
    }

    // Step 1: Fetch all classes from the external API once
    let allExternalClasses;
    try {
      const response = await axios.get(
        `${SCHEDULING_API_URL}/teachers/all-subjects`
      );
      allExternalClasses = response.data; // Assuming the API returns an array of class objects
    } catch (error) {
      console.error("Error fetching classes from external API:", error);
      throw new Error("Failed to fetch classes from the external source.");
    }

    // Create a map of class_id to class object for quick lookup
    const externalClassesMap = new Map();
    allExternalClasses.forEach((cls) => {
      externalClassesMap.set(cls.id, cls);
    });

    // Convert Sequelize instance to plain object
    const studentData = student.toJSON();

    if (
      studentData.student_personal_datum &&
      studentData.student_personal_datum.student_class_enrollments
    ) {
      // Enrich each enrollment with classDetails
      studentData.student_personal_datum.student_class_enrollments =
        studentData.student_personal_datum.student_class_enrollments.map(
          (enrollment) => {
            const externalClass = externalClassesMap.get(enrollment.class_id);

            if (!externalClass) {
              // If external class data is not found, skip enrichment or handle accordingly
              return enrollment;
            }

            // Construct classDetails based on externalClass data
            const classDetails = {
              subjectCode: externalClass.subject_code,
              unit: externalClass.units,
              subjectDescription: externalClass.subject,
              semesterName: externalClass.semester,
              schoolYear: externalClass.school_year,
              schedule: {
                day: externalClass.day,
                start: externalClass.start,
                end: externalClass.end,
                recurrencePattern: externalClass.recurrencePattern,
              },
              room: {
                room_number: externalClass.room, // As per your instruction, room is a string, not an object
              },
              instructorFullName: externalClass.teacher,
              // If you have more instructor details, include them here
            };

            return {
              ...enrollment,
              classDetails, // Attach classDetails to the enrollment
            };
          }
        );
    }

    return studentData;
  } catch (error) {
    console.error("Error in getStudentById:", error.message);
    throw new Error(`Failed to retrieve student data: ${error.message}`);
  }
}

async function getStudentGrades(student_id, campus_id) {
  try {
    // Step 1: Verify that the student exists
    const student = await db.StudentOfficial.findOne({
      where: {student_id, campus_id},
      include: [
        {
          model: db.StudentPersonalData,
        },
      ],
    });

    if (!student) {
      throw new Error("Student not found");
    }

    // Step 2: Fetch grades from the external API
    const gradesResponse = await axios.get(
      `https://xavgrading-api.onrender.com/external/get-grades-of-students-by-studentid/${student_id}`
    );

    // Assuming the API returns a JSON object with the grades
    const gradesData = gradesResponse.data;

    return gradesData;
  } catch (error) {
    console.error("Error in getStudentGrades:", error.message);
    throw new Error(`Failed to retrieve student grades: ${error.message}`);
  }
}

async function getUnenrolledStudents(
  campus_id,
  existing_students,
  new_unenrolled_students,
  semester_id,
  enlistment
) {
  // Step 1: Get the target semester
  const semesterWhere = {
    isDeleted: false,
  };
  if (semester_id) {
    semesterWhere.semester_id = semester_id;
  } else {
    semesterWhere.isActive = true;
  }
  if (campus_id) {
    semesterWhere.campus_id = campus_id;
  }

  const targetSemester = await db.Semester.findOne({
    where: semesterWhere,
    attributes: ["semester_id"], // Select only needed fields
  });

  if (!targetSemester) {
    throw new Error("No semester found.");
  }

  // Initialize an empty array to hold the result
  let studentsWithEnrollmentStatus = [];


  // Fetch classes from the external API
  let externalClasses;
  try {
    const response = await axios.get(
      `${SCHEDULING_API_URL}/teachers/all-subjects`
    );
    externalClasses = response.data;
  } catch (error) {
    console.error("Error fetching classes from external API:", error);
    throw new Error("Failed to fetch classes from the external source.");
  }

  // Filter classes based on the target semester
  const filteredClasses = externalClasses.filter(
    (cls) => cls.semester_id === targetSemester.semester_id
  );

  // If no classes match the target semester, return empty array
  if (filteredClasses.length === 0) {
    return [];
  }

  // Extract class IDs from filtered classes
  const filteredClassIds = filteredClasses.map((cls) => cls.id);

  

  if (existing_students) {
    // Step 2a: Handle existing_students

    // Fetch existing official students who have not been enrolled in the target semester
    const students = await db.StudentPersonalData.findAll({
      where: campus_id ? {campus_id} : {},
      attributes: [
        "student_personal_id",
        "firstName",
        "lastName",
        "middleName",
      ],
      include: [
        {
          model: db.StudentOfficial,
          attributes: ["student_id"],
          required: true, // Only include students who have a StudentOfficial record
        },
        {
          model: db.StudentAcademicBackground,
          attributes: [], // No need to select fields from here
          required: true,
          where: {
            semester_id: {[Op.ne]: targetSemester.semester_id},
          },
        },
        {
          model: db.StudentClassEnrollments,
          attributes: ["student_class_enrollment_id"],
          required: false,
          where: {
            status: "enlisted",
          },
        },
      ],
      distinct: true,
    });

    // Map the students to include enrollment status without individual queries
    studentsWithEnrollmentStatus = students.map((student) => ({
      student_id: student.student_official.student_id,
      student_personal_id: student.student_personal_id,
      firstName: student.firstName,
      lastName: student.lastName,
      middleName: student.middleName,
      fullName: `${student.firstName} ${student.middleName || ""} ${
        student.lastName
      }`,
      hasEnlistedSubjects:
        student.student_class_enrollments &&
        student.student_class_enrollments.length > 0,
    }));

    return studentsWithEnrollmentStatus;
  } else if (new_unenrolled_students) {
    // Step 2b: Handle new_unenrolled_students

    // Fetch students who have no StudentOfficial record and have enlisted classes in the target semester
    const students = await db.StudentPersonalData.findAll({
      where: campus_id ? {campus_id} : {},
      attributes: [
        "student_personal_id",
        "firstName",
        "lastName",
        "middleName",
        "enrollmentType",
      ],
      include: [
        {
          model: db.StudentOfficial,
          attributes: [], // No need to select fields
          required: false,
        },
        {
          model: db.StudentAcademicBackground,
          attributes: ["yearLevel"],
          required: true,
          include: [
            {
              model: db.Program,
              attributes: ["programCode", "programDescription"],
              required: true,
            },
          ],
        },
        {
          model: db.StudentClassEnrollments,
          attributes: ["student_class_enrollment_id"],
          required: false, // Changed to true to ensure students have enlisted classes
          where: {
            status: "enlisted",
            class_id: {[Op.in]: filteredClassIds},
          },
        },
      ],
      where: {
        ...(campus_id ? {campus_id} : {}),
        "$student_official.student_id$": null, // Ensure no StudentOfficial record
      },
      // Use distinct to prevent duplicates
      distinct: true,
    });

    // Optional: Log fetched students for debugging
    console.log(
      "unenrolledStudents: ",
      students.map((s) => s.toJSON())
    );

    // Step 2b.5: Map the students as needed
    studentsWithEnrollmentStatus = students.map((student) => ({
      id: student.student_personal_id,
      firstName: student.firstName,
      lastName: student.lastName,
      middleName: student.middleName,
      fullName: `${student.firstName} ${student.middleName || ""} ${
        student.lastName
      }`,
      programCode:
        student.student_current_academicbackground.program.programCode,
      yearLevel: student.student_current_academicbackground.yearLevel,
      enrollmentType: student.enrollmentType,
      hasEnlistedSubjects: student.student_class_enrollments.length > 0,
    }));

    return studentsWithEnrollmentStatus;
  } else if (enlistment) {
    // Step 2c: Handle students ready for enlistment

    // Fetch students who have an EnrollmentProcess record for the target semester
    // with registrar_status 'accepted' and accounting_status 'upcoming'
    const students = await db.StudentPersonalData.findAll({
      where: campus_id ? {campus_id} : {},
      attributes: [
        "student_personal_id",
        "firstName",
        "lastName",
        "middleName",
      ],
      include: [
        {
          model: db.StudentOfficial,
          attributes: ["student_id"],
          required: true,
        },
        {
          model: db.EnrollmentProcess,
          attributes: [
            "registrar_status",
            "accounting_status",
            "final_approval_status",
          ],
          required: true,
          where: {
            semester_id: targetSemester.semester_id,
            registrar_status: "accepted",
            accounting_status: "upcoming",
          },
        },
        {
          model: db.StudentAcademicBackground,
          attributes: ["yearLevel"],
          required: true,
          include: [
            {
              model: db.Program,
              attributes: ["programCode", "programDescription"],
              required: true,
            },
          ],
        },
        {
          model: db.StudentClassEnrollments,
          attributes: ["student_class_enrollment_id"],
          required: false, // Changed to true to ensure students have enlisted classes
          where: {
            status: "enlisted",
            class_id: {[Op.in]: filteredClassIds},
          },
        },
      ],
      distinct: true,
    });

    // Map the students to include necessary information
    studentsWithEnrollmentStatus = students.map((student) => ({
      id: student.student_personal_id,
      firstName: student.firstName,
      lastName: student.lastName,
      middleName: student.middleName,
      fullName: `${student.firstName} ${student.middleName || ""} ${
        student.lastName
      }`,
      programCode:
        student.student_current_academicbackground.program.programCode,
      yearLevel: student.student_current_academicbackground.yearLevel,
      enrollmentType: student.enrollmentType,
      hasEnlistedSubjects: student.student_class_enrollments.length > 0,
    }));

    return studentsWithEnrollmentStatus;
  } else {
    return [];
  }
}

async function updateStudentInformation(params, accountId) {
  const {sequelize} = db;
  const transaction = await sequelize.transaction();

  try {
    const {
      personalData,
      addPersonalData,
      familyDetails,
      academicBackground,
      academicHistory,
      documents,
    } = params;

    const studentPersonalId = personalData.student_personal_id;

    if (!studentPersonalId) {
      throw new Error("Student Personal ID is required.");
    }

    // Fetch existing student data
    const studentData = await db.StudentPersonalData.findByPk(
      studentPersonalId,
      {
        transaction,
      }
    );

    if (!studentData) {
      throw new Error(`Student with ID ${studentPersonalId} not found.`);
    }

    // Update Student Personal Data
    await studentData.update(personalData, {transaction});

    // Update Additional Personal Data
    const existingAddPersonalData = await db.StudentAddPersonalData.findOne({
      where: {student_personal_id: studentPersonalId},
      transaction,
    });

    if (existingAddPersonalData) {
      await existingAddPersonalData.update(addPersonalData, {transaction});
    } else {
      await db.StudentAddPersonalData.create(
        {
          student_personal_id: studentPersonalId,
          ...addPersonalData,
        },
        {transaction}
      );
    }

    // Update Family Details
    const existingFamilyDetails = await db.StudentFamily.findOne({
      where: {student_personal_id: studentPersonalId},
      transaction,
    });

    if (existingFamilyDetails) {
      await existingFamilyDetails.update(familyDetails, {transaction});
    } else {
      await db.StudentFamily.create(
        {
          student_personal_id: studentPersonalId,
          ...familyDetails,
        },
        {transaction}
      );
    }

    // Update Academic Background
    const existingAcademicBackground =
      await db.StudentAcademicBackground.findOne({
        where: {student_personal_id: studentPersonalId},
        transaction,
      });

    if (existingAcademicBackground) {
      await existingAcademicBackground.update(academicBackground, {
        transaction,
      });
    } else {
      await db.StudentAcademicBackground.create(
        {
          student_personal_id: studentPersonalId,
          ...academicBackground,
        },
        {transaction}
      );
    }

    // Update Academic History
    const existingAcademicHistory = await db.StudentAcademicHistory.findOne({
      where: {student_personal_id: studentPersonalId},
      transaction,
    });

    if (existingAcademicHistory) {
      await existingAcademicHistory.update(academicHistory, {transaction});
    } else {
      await db.StudentAcademicHistory.create(
        {
          student_personal_id: studentPersonalId,
          ...academicHistory,
        },
        {transaction}
      );
    }

    // Update Documents
    const existingDocuments = await db.StudentDocuments.findOne({
      where: {student_personal_id: studentPersonalId},
      transaction,
    });

    if (existingDocuments) {
      await existingDocuments.update(documents, {transaction});
    } else {
      await db.StudentDocuments.create(
        {
          student_personal_id: studentPersonalId,
          ...documents,
        },
        {transaction}
      );
    }

    // Log the update action in the history table
    await db.History.create(
      {
        action: "update",
        entity: "Student",
        entityId: studentPersonalId,
        changes: params,
        accountId: accountId,
      },
      {transaction}
    );

    // Commit the transaction
    await transaction.commit();

    return {
      message: "Student information updated successfully!",
    };
  } catch (error) {
    // Rollback transaction if there is an error
    await transaction.rollback();

    throw new Error(`${error.message}`);
  }
}

async function getStudentPersonalDataById(student_personal_id) {
  const student = await db.StudentPersonalData.findOne({
    where: {student_personal_id},
    include: [
      {
        model: db.StudentAcademicBackground,
        include: [{model: db.Semester}],
      },
      {model: db.StudentOfficial},
    ],
  });

  if (!student) throw "Student not found";

  return {
    // ...student.toJSON(),
    student_personal_id: student.student_personal_id,
    firstName: student.firstName,
    lastName: student.lastName,
    officialStudentId: student?.student_official?.student_id || null,
    schoolYear:
      student.student_current_academicbackground.semester.schoolYear || "N/A",
    semesterName:
      student.student_current_academicbackground.semester.semesterName || "N/A",
  };
}
