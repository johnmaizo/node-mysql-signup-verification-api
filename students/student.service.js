const {Op} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

module.exports = {
  addEnrollment,
  getStudentOfficial,
  getStudentById,
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

  // Update the academic background's semester_id
  academicBackground.semester_id = semester_id;
  await academicBackground.save();

  // Log the action if necessary
  await db.History.create({
    action: "update",
    entity: "StudentAcademicBackground",
    entityId: academicBackground.id,
    changes: {semester_id},
    accountId,
  });

  // Log the action if necessary
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
          // Include StudentClassEnrollments
          {
            model: db.StudentClassEnrollments,
            include: [
              {
                model: db.Class,
                include: [
                  {
                    model: db.CourseInfo, // For Subject Code, Description, Units
                  },
                  {
                    model: db.Semester, // For Semester and School Year
                  },
                  {
                    model: db.BuildingStructure, // For Room info
                  },
                  {
                    model: db.Employee, // For Instructor info
                  },
                  // Include Schedule if necessary
                ],
              },
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

  return student.toJSON();
}

async function getUnenrolledStudents(
  campus_id,
  existing_students,
  new_unenrolled_students
) {
  // Get active semester
  const activeSemester = await db.Semester.findOne({
    where: {
      isActive: true,
      isDeleted: false,
      ...(campus_id ? {campus_id} : {}),
    },
  });

  if (!activeSemester) {
    throw new Error("No active semester found.");
  }

  if (existing_students) {
    // Fetch existing official students who have not been enrolled in the new semester
    const students = await db.StudentPersonalData.findAll({
      where: {
        ...(campus_id ? {campus_id} : {}),
      },
      include: [
        {
          model: db.StudentOfficial,
          required: true, // Only include students who have a StudentOfficial record
        },
        {
          model: db.StudentAcademicBackground,
          required: true,
          where: {
            semester_id: {[Op.ne]: activeSemester.semester_id},
          },
        },
      ],
    });

    // For each student, check if they have enlisted subjects
    const studentsWithEnrollmentStatus = await Promise.all(
      students.map(async (student) => {
        const hasEnlistedSubjects = await db.StudentClassEnrollments.findOne({
          where: {
            student_personal_id: student.student_personal_id,
            status: "enlisted",
          },
        });

        return {
          student_id: student.student_official.student_id,
          student_personal_id: student.student_personal_id,
          firstName: student.firstName,
          lastName: student.lastName,
          middleName: student.middleName,
          fullName: `${student.firstName} ${student.middleName || ""} ${
            student.lastName
          }`,
          hasEnlistedSubjects: !!hasEnlistedSubjects,
        };
      })
    );

    return studentsWithEnrollmentStatus;
  } else if (new_unenrolled_students) {
    // Directly fetch students who have no student_id and have enlisted classes
    const students = await db.StudentPersonalData.findAll({
      where: {
        ...(campus_id ? {campus_id} : {}),
        "$student_official.student_id$": null, // No StudentOfficial record
      },
      include: [
        {
          model: db.StudentClassEnrollments,
          required: true, // Ensures at least one enrolled class
          where: {
            status: "enlisted",
          },
          include: [
            {
              model: db.Class,
              required: true,
              where: {
                semester_id: activeSemester.semester_id,
              },
            },
          ],
        },
        {
          model: db.StudentOfficial,
          require: true,
        },
      ],
    });

    console.log(
      "unenrolledStudents: ",
      students.map((s) => s.toJSON())
    );

    // Map the students as needed
    const studentsWithEnrollmentStatus = students.map((student) => ({
      student_personal_id: student.student_personal_id,
      firstName: student.firstName,
      lastName: student.lastName,
      middleName: student.middleName,
      fullName: `${student.firstName} ${student.middleName || ""} ${
        student.lastName
      }`,
      hasEnlistedSubjects: true, // Since the query ensures they have enlisted classes
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
