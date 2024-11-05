const {Op} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

module.exports = {
  getStudentOfficial,
  getStudentById,
  updateStudentInformation,
};

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
