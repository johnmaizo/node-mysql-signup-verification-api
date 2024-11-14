const {Op, where} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

const axios = require("axios");

const deepEqual = require("deep-equal");

require("dotenv").config();

const MHAFRIC_API_URL = process.env.MHAFRIC_API;
const SCHEDULING_API_URL = process.env.SCHEDULING_API_URL;

module.exports = {
  submitApplication,
  submitEnlistment,

  updateEnrollmentProcess,
  getAllEnrollmentStatus,
  getEnrollmentStatusById,
  getAllStudentsOfficial,
  getAllStudentsOfficalActive,
  getAllStudentOfficialCount,
  getChartData,
  getStudentAcademicBackground,

  getStudentById,
  updateStudent,
  // deleteStudent,

  enrollOlineApplicantStudent,
  getAllOnlineApplicant,

  getStudentEnrolledClasses,
  getAllEnrolledClasses,
  getEnlistedClasses,
};

async function submitApplication(params, accountId) {
  const {sequelize} = require("_helpers/db");

  const transaction = await sequelize.transaction();

  try {
    const {
      personalData, // Personal data
      addPersonalData, // Additional personal data
      familyDetails, // Family information
      academicBackground, // Academic background
      academicHistory, // Academic history
      documents, // Documents
    } = params;

    // Check if email already exists
    const existingEmail = await db.StudentPersonalData.findOne({
      where: {email: personalData.email},
    });

    if (existingEmail) {
      throw new Error(`Email "${personalData.email}" already exists.`);
    }

    // 1. Create Student Personal Data
    const newStudentData = await db.StudentPersonalData.create(personalData, {
      transaction,
    });

    const studentPersonalId = newStudentData.student_personal_id;

    // 2. Create Additional Personal Data
    await db.StudentAddPersonalData.create(
      {
        student_personal_id: studentPersonalId,
        ...addPersonalData,
      },
      {transaction}
    );

    // 3. Create Family Details
    await db.StudentFamily.create(
      {
        student_personal_id: studentPersonalId,
        ...familyDetails,
      },
      {transaction}
    );

    // 4. Create Academic Background
    await db.StudentAcademicBackground.create(
      {
        student_personal_id: studentPersonalId,
        ...academicBackground,
      },
      {transaction}
    );

    // 5. Create Academic History
    await db.StudentAcademicHistory.create(
      {
        student_personal_id: studentPersonalId,
        ...academicHistory,
      },
      {transaction}
    );

    // 6. Create Enrollment Process
    await db.EnrollmentProcess.create(
      {
        student_personal_id: studentPersonalId,
        semester_id: academicBackground.semester_id,
        registrar_status: "accepted",
        registrar_status_date: new Date(),
        accounting_status: "upcoming",
        payment_confirmed: false,
        final_approval_status: false,
      },
      {transaction}
    );

    // 7. Create Documents
    await db.StudentDocuments.create(
      {
        student_personal_id: studentPersonalId,
        ...documents,
      },
      {transaction}
    );

    // 8. Log the creation action in the history table
    await db.History.create(
      {
        action: "create",
        entity: "Student",
        entityId: studentPersonalId,
        changes: params,
        accountId: accountId,
      },
      {transaction}
    );

    // Commit the transaction after all records are successfully created
    await transaction.commit();

    return {
      message:
        "Application submitted successfully and enrollment process started!",
      student_personal_id: studentPersonalId, // Include the ID here
    };
  } catch (error) {
    // Rollback transaction if there is an error
    await transaction.rollback();

    throw new Error(`${error.message}`);
  }
}

async function submitEnlistment(params, options = {}) {
  const {accountId = null, external = false} = options;
  let {student_personal_id, class_ids, fulldata_applicant_id} = params;

  const transaction = await db.sequelize.transaction();

  try {
    // If external, resolve student_personal_id using fulldata_applicant_id
    if (external) {
      const studentData = await db.StudentPersonalData.findOne({
        where: {applicant_id_for_online: fulldata_applicant_id},
        transaction,
      });

      if (!studentData) {
        throw new Error("Invalid fulldata_applicant_id. Student not found.");
      }

      student_personal_id = studentData.student_personal_id;
    }

    // Ensure the student exists
    const student = await db.StudentPersonalData.findByPk(student_personal_id, {
      transaction,
    });
    if (!student) {
      throw new Error("Student not found.");
    }

    // Fetch existing enlisted classes for the student
    const existingEnlistments = await db.StudentClassEnrollments.findAll({
      where: {
        student_personal_id,
        status: "enlisted",
      },
      transaction,
    });

    const existingClassIds = existingEnlistments.map(
      (enrollment) => enrollment.class_id
    );

    // Determine classes to add and remove
    const classIdsToAdd = class_ids.filter(
      (id) => !existingClassIds.includes(id)
    );
    const classIdsToRemove = existingClassIds.filter(
      (id) => !class_ids.includes(id)
    );

    // Add new enlistments
    if (classIdsToAdd.length > 0) {
      const studentClassEnrollmentsData = classIdsToAdd.map((class_id) => ({
        student_personal_id,
        class_id,
        status: "enlisted",
      }));

      await db.StudentClassEnrollments.bulkCreate(studentClassEnrollmentsData, {
        transaction,
      });
    }

    // Remove enlistments that are no longer selected
    if (classIdsToRemove.length > 0) {
      await db.StudentClassEnrollments.destroy({
        where: {
          student_personal_id,
          class_id: classIdsToRemove,
          status: "enlisted",
        },
        transaction,
      });
    }

    // Optionally, log the action in history if not external
    if (!external && accountId) {
      // Prepare changes description
      const changes = {
        addedClassIds: classIdsToAdd,
        removedClassIds: classIdsToRemove,
      };

      await db.History.create(
        {
          action: "create",
          entity: "Enlistment",
          entityId: student_personal_id, // Assuming entityId refers to the student
          changes: JSON.stringify(changes), // Store changes as a JSON string
          student_personal_id,
          class_ids,
          accountId: accountId,
        },
        {transaction}
      );
    }

    // Commit the transaction
    await transaction.commit();

    return;
  } catch (error) {
    await transaction.rollback();
    throw new Error(error.message);
  }
}

async function enrollOlineApplicantStudentMockUpOnsite(student_personal_id) {
  const transaction = await db.sequelize.transaction();

  try {
    // Step 1: Fetch the applicant data along with necessary associations
    const applicant = await db.StudentPersonalData.findOne({
      where: {student_personal_id},
      include: [
        {model: db.StudentAddPersonalData, as: "addPersonalData"},
        {model: db.StudentFamily, as: "familyDetails"},
        {
          model: db.StudentAcademicBackground,
          include: [{model: db.Prospectus}],
        },
        {model: db.StudentAcademicHistory, as: "academicHistory"},
      ],
      transaction,
    });

    if (!applicant) {
      throw new Error("Applicant not found");
    }

    // Step 2: Fetch classes from the external API once
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

    // **Modified Section: Check if the student is already enrolled**
    if (applicant.status === "enrolled") {
      console.log(
        `Student with personal ID ${student_personal_id} is already enrolled. Proceeding to update class enrollments.`
      );

      // Get the student's prospectus ID and semester ID
      const {prospectus_id, semester_id} =
        applicant.student_current_academicbackground;

      // Step 3: Filter classes based on active semester
      const filteredClasses = allExternalClasses.filter(
        (cls) => cls.semester_id === semester_id
      );

      // Extract class_ids from filtered classes
      const filteredClassIds = filteredClasses.map((cls) => cls.id);

      // Step 4: Find class enrollments for the specific semester with status "enlisted"
      const classEnrollments = await db.StudentClassEnrollments.findAll({
        where: {
          student_personal_id,
          status: "enlisted",
          class_id: {[Op.in]: filteredClassIds}, // Match class IDs from external API
        },
        transaction,
      });

      console.log(
        "\n\nclassEnrollments: ",
        classEnrollments.map((enrollment) => enrollment.toJSON())
      );

      if (classEnrollments.length === 0) {
        console.log("No enlisted classes found for the student.");
        // Commit the transaction and exit since there's nothing to update
        await transaction.commit();
        return {
          status: "skipped",
          message:
            "Student is already enrolled with no enlisted classes to update.",
        };
      }

      // Extract the IDs of these enrollments
      const enrollmentIds = classEnrollments.map(
        (enrollment) => enrollment.student_class_enrollment_id
      );

      // Step 5: Update statuses of these class enrollments to "enrolled"
      const [affectedRows] = await db.StudentClassEnrollments.update(
        {status: "enrolled"},
        {
          where: {student_class_enrollment_id: {[Op.in]: enrollmentIds}},
          transaction,
        }
      );

      console.log(
        `Updated ${affectedRows} class enrollments to 'enrolled' for student ID ${student_personal_id}.`
      );

      // Commit the transaction after successful updates
      await transaction.commit();

      // **Optionally, return a status indicating the update was successful**
      return {
        status: "updated",
        message: "Student is already enrolled, class enrollments updated.",
      };
    }

    // **Proceed with the enrollment process for students not already enrolled**

    // Step 6: Generate student ID if not already generated
    let student_id;
    const existingStudentOfficial = await db.StudentOfficial.findOne({
      where: {student_personal_id},
      transaction,
    });

    const campus = await db.Campus.findOne({
      where: {campus_id: applicant.campus_id},
      transaction,
    });

    if (!campus) {
      throw new Error("Campus not found");
    }

    if (existingStudentOfficial && existingStudentOfficial.student_id) {
      student_id = existingStudentOfficial.student_id;
    } else {
      student_id = await generateStudentId(campus.campusName);

      // Save student details in the database
      const studentOfficial = new db.StudentOfficial({
        student_id: student_id,
        campus_id: campus.campus_id,
        student_personal_id: applicant.student_personal_id,
      });
      await studentOfficial.save({transaction});
    }

    // Step 7: Update the student's status to 'enrolled' in StudentPersonalData
    applicant.status = "enrolled";
    await applicant.save({transaction});

    // Get the student's prospectus ID and semester ID
    const {prospectus_id, semester_id} =
      applicant.student_current_academicbackground;

    // Step 8: Filter classes based on semester_id from already fetched data
    const classesForSemester = allExternalClasses.filter(
      (cls) => cls.semester_id === semester_id
    );

    // Extract class_ids for the active semester
    const classIdsForSemester = classesForSemester.map((cls) => cls.id);

    // Step 9: Fetch class enrollments from the database matching the class_ids and status "enlisted"
    const classEnrollments = await db.StudentClassEnrollments.findAll({
      where: {
        student_personal_id,
        status: "enlisted",
        class_id: {[Op.in]: classIdsForSemester}, // Match class IDs from external API
      },
      transaction,
    });

    if (classEnrollments.length === 0) {
      throw new Error("No enlisted classes found for the student.");
    }

    // Log the first class enrollment for debugging
    console.log(classEnrollments[0].toJSON());

    // Step 10: Post data to the external API if enrollmentType is "on-site"

    /*

    if (applicant.enrollmentType === "on-site") {
      const onlineFullStudentInfoPOST = await axios.post(
        `${MHAFRIC_API_URL}/api/onsite-full-student-data/`,
        {
          student_id: student_id,
          campus: campus.campus_id,
          personal_data: {
            f_name: applicant.firstName || "",
            m_name: applicant.middleName || "",
            suffix: applicant.suffix || "",
            l_name: applicant.lastName || "",
            sex: applicant.gender || "Unknown",
            birth_date: applicant.birthDate || "1900-01-01",
            birth_place: applicant.birthPlace || "Unknown",
            marital_status: applicant.civilStatus || "Single",
            religion: applicant.religion || "Unknown",
            country: applicant.country || "Unknown",
            email: applicant.email || "",
            acr: applicant.ACR || null,
            status: "officially enrolled",
            on_site: true,
          },
          add_personal_data: {
            city_address: applicant.addPersonalData?.cityAddress || "Unknown",
            province_address:
              applicant.addPersonalData?.provinceAddress || "Unknown",
            contact_number: applicant.contactNumber || "",
            city_contact_number:
              applicant.addPersonalData?.cityTelNumber || null,
            province_contact_number:
              applicant.addPersonalData?.provinceTelNumber || null,
            citizenship: applicant.citizenship || "Unknown",
          },
          family_background: {
            father_fname: applicant.familyDetails?.fatherFirstName || "",
            father_mname: applicant.familyDetails?.fatherMiddleName || "",
            father_lname: applicant.familyDetails?.fatherLastName || "",
            father_contact_number:
              applicant.familyDetails?.fatherContactNumber || "",
            father_email: applicant.familyDetails?.fatherEmail || "",
            father_occupation: applicant.familyDetails?.fatherOccupation || "",
            father_income: applicant.familyDetails?.fatherIncome || 0,
            father_company: applicant.familyDetails?.fatherCompanyName || "",
            mother_fname: applicant.familyDetails?.motherFirstName || "",
            mother_mname: applicant.familyDetails?.motherMiddleName || "",
            mother_lname: applicant.familyDetails?.motherLastName || "",
            mother_contact_number:
              applicant.familyDetails?.motherContactNumber || "",
            mother_email: applicant.familyDetails?.motherEmail || "",
            mother_occupation: applicant.familyDetails?.motherOccupation || "",
            mother_income: applicant.familyDetails?.motherIncome || "",
            mother_company: applicant.familyDetails?.motherCompanyName || "",
            guardian_fname: applicant.familyDetails?.guardianFirstName || "",
            guardian_mname: applicant.familyDetails?.guardianMiddleName || "",
            guardian_lname: applicant.familyDetails?.guardianLastName || "",
            guardian_relation: applicant.familyDetails?.guardianRelation || "",
            guardian_contact_number:
              applicant.familyDetails?.guardianContactNumber || "",
            guardian_email:
              applicant.familyDetails?.guardianFirstName &&
              applicant.familyDetails?.guardianLastName
                ? `${applicant.familyDetails?.guardianFirstName}${applicant.familyDetails?.guardianLastName}@example.com`
                    .toLowerCase()
                    .trim()
                : null,
          },
          academic_background: {
            program: applicant.student_current_academicbackground.program_id,
            major_in:
              applicant.student_current_academicbackground?.majorIn || null,
            student_type:
              applicant.student_current_academicbackground?.studentType ||
              "Regular",
            semester_entry:
              applicant.student_current_academicbackground?.semester_id, // Adjust as needed
            year_level: applicant.student_current_academicbackground?.yearLevel,
            year_entry:
              applicant.student_current_academicbackground?.yearEntry || 0,
            year_graduate:
              applicant.student_current_academicbackground?.yearGraduate || 0,
            application_type:
              applicant.student_current_academicbackground?.applicationType ||
              "Freshmen",
          },
          academic_history: {
            elementary_school:
              applicant.academicHistory?.elementarySchool || "Not Provided",
            elementary_address:
              applicant.academicHistory?.elementaryAddress || "Not Provided",
            elementary_honors:
              applicant.academicHistory?.elementaryHonors || "None",
            elementary_graduate:
              applicant.academicHistory?.elementaryGraduate || null,
            junior_highschool:
              applicant.academicHistory?.secondarySchool || "Not Provided",
            junior_address:
              applicant.academicHistory?.secondaryAddress || "Not Provided",
            junior_honors: applicant.academicHistory?.secondaryHonors || "None",
            junior_graduate:
              applicant.academicHistory?.secondaryGraduate || null,
            senior_highschool:
              applicant.academicHistory?.seniorHighSchool || "Not Provided",
            senior_address:
              applicant.academicHistory?.seniorHighAddress || "Not Provided",
            senior_honors:
              applicant.academicHistory?.seniorHighHonors || "None",
            senior_graduate:
              applicant.academicHistory?.seniorHighSchoolGraduate || null,
            ncae_grade: applicant.academicHistory?.ncae_grade || "N/A",
            ncae_year_taken: applicant.academicHistory?.ncae_year_taken || null,
            latest_college:
              applicant.academicHistory?.latest_college || "Not Provided",
            college_address:
              applicant.academicHistory?.college_address || "Not Provided",
            college_honors: applicant.academicHistory?.college_honors || "None",
            program: applicant.academicHistory?.program || "N/A",
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log(
        "Post response (onlineFullStudentInfoPOST):",
        onlineFullStudentInfoPOST.data
      );
    }

    */

    // Step 11: Extract the IDs of these enrollments
    const enrollmentIds = classEnrollments.map(
      (enrollment) => enrollment.student_class_enrollment_id
    );

    // Step 12: Update statuses of these class enrollments
    await db.StudentClassEnrollments.update(
      {status: "enrolled"},
      {
        where: {student_class_enrollment_id: enrollmentIds},
        transaction,
      }
    );

    // Step 13: Proceed with mapping to student_subject
    const studentSubjectsData = [];

    for (const enrolledClass of classEnrollments) {
      const class_id = enrolledClass.class_id;
      const externalClass = externalClassesMap.get(class_id);

      if (!externalClass) {
        throw new Error(
          `External class data not found for class ID ${class_id}`
        );
      }

      const course_id = externalClass.subject_id;

      // Find the prospectus_subject_id
      const prospectusSubject = await db.ProspectusSubject.findOne({
        where: {
          prospectus_id: prospectus_id,
          course_id: course_id,
        },
        transaction,
      });

      if (!prospectusSubject) {
        throw new Error(
          `Prospectus subject not found for course ID ${course_id} in prospectus ID ${prospectus_id}`
        );
      }

      studentSubjectsData.push({
        student_personal_id,
        prospectus_subject_id: prospectusSubject.prospectus_subject_id,
        isActive: true,
        isDeleted: false,
      });
    }

    // Step 14: Insert into student_subject
    await db.StudentSubjects.bulkCreate(studentSubjectsData, {transaction});

    // Commit the transaction
    await transaction.commit();

    console.log(
      `Enrollment process completed successfully for student ID ${student_id}.`
    );

    // **Optionally, return a status indicating success**
    return {status: "enrolled", student_id};
  } catch (error) {
    // Rollback the transaction in case of any errors
    await transaction.rollback();
    console.error(
      "Error in enrollOlineApplicantStudentMockUpOnsite:",
      error.response ? error.response.data : error.message
    );
    throw new Error(
      `Enrollment failed: ${
        error.response ? JSON.stringify(error.response.data) : error.message
      }`
    );
  }
}

// ! Log the creation action
// await db.History.create({
//   action: "create",
//   entity: "Student",
//   entityId: studentOfficial.id,
//   changes: studentparams,
//   accountId: accountId,
// });

async function generateStudentIdWithDepartmentCode(programCode, campusName) {
  if (!campusName) {
    throw new Error("Campus name is required");
  }

  // Fetch the campus based on the campus name
  const campus = await db.Campus.findOne({where: {campusName: campusName}});

  // Check if campus exists
  if (!campus) {
    throw new Error("Campus not found");
  }

  const currentYear = new Date().getFullYear().toString();

  // Find all departments related to the given campus name
  const departmentsOnCampus = await db.Department.findAll({
    include: [
      {
        model: db.Campus,
        where: {
          campusName: campusName,
        },
      },
    ],
  });

  if (!departmentsOnCampus || departmentsOnCampus.length === 0) {
    throw new Error(`No departments found for campus "${campusName}"`);
  }

  // Find the program based on the programCode within the filtered departments
  const program = await db.Program.findOne({
    where: {
      programCode: programCode,
    },
    include: [
      {
        model: db.Department,
        where: {
          department_id: {
            [Op.in]: departmentsOnCampus.map((dept) => dept.department_id),
          },
        },
      },
    ],
  });

  if (!program) {
    throw new Error(
      `Program "${programCode}" not found in any department for campus "${campusName}"`
    );
  }

  // Get the index of the department within departmentsOnCampus
  const departmentIndex = departmentsOnCampus.findIndex(
    (dept) => dept.department_id === program.department.department_id
  );

  if (departmentIndex === -1) {
    throw new Error(
      `Department not found in the list of departments for campus "${campusName}"`
    );
  }

  // Generate department code
  const departmentCode = (departmentIndex + 1).toString().padStart(2, "0");

  // Find the last student ID for the campus and the current year
  const lastStudentOnDepartment = await db.StudentOfficial.findOne({
    where: {
      student_id: {
        [Op.like]: `${currentYear}-${departmentCode}-%`, // Specific to the campus and department
      },
      campus_id: campus.campus_id, // Ensures it matches the campus
    },
    order: [["createdAt", "DESC"]],
  });

  const lastStudent = await db.StudentOfficial.findOne({
    where: {
      student_id: {
        [Op.like]: `${currentYear}%`,
      },
      campus_id: campus.campus_id, // Ensures it matches the campus
    },
    order: [["createdAt", "DESC"]],
  });

  // If a student exists, increment the last student ID, otherwise start from 00001
  if (lastStudent) {
    const lastId = lastStudent.student_id.split("-")[2]; // Get the last part of the ID (numeric part)
    const newIdNumber = (parseInt(lastId) + 1).toString().padStart(4, "0");
    return `${currentYear}-${departmentCode}-${newIdNumber}`;
  } else {
    return `${currentYear}-${departmentCode}-0001`;
  }
}

async function generateStudentId(campusName) {
  if (!campusName) {
    throw new Error("Campus name is required");
  }

  // Fetch the campus based on the campus name
  const campus = await db.Campus.findOne({where: {campusName: campusName}});

  // Check if campus exists
  if (!campus) {
    throw new Error("Campus not found");
  }

  const currentYear = new Date().getFullYear().toString();

  // Find the last student ID for the campus and the current year
  const lastStudent = await db.StudentOfficial.findOne({
    where: {
      student_id: {
        [Op.like]: `${currentYear}-%`,
      },
      campus_id: campus.campus_id, // Ensures it matches the campus
    },
    order: [["createdAt", "DESC"]],
  });

  // If a student exists, increment the last student ID,  otherwise start from 00001
  if (lastStudent) {
    const lastId = lastStudent.student_id.split("-")[1]; // Get the numeric part of the ID
    const newIdNumber = (parseInt(lastId) + 1).toString().padStart(5, "0");
    return `${currentYear}-${newIdNumber}`;
  } else {
    return `${currentYear}-00001`;
  }
}

// ! Online Applicants

async function enrollOlineApplicantStudent({fulldata_applicant_id}) {
  console.log("\n\n\nFULLDATA_applicant_id: ", fulldata_applicant_id);
  try {
    // Fetch data from external API
    const response = await axios.get(
      `${MHAFRIC_API_URL}/api/full-student-data/?filter=fulldata_applicant_id=${fulldata_applicant_id}`
    );
    const data = response.data;

    // Map the data to our database schema
    const personalData = data.personal_data[0];
    const addPersonalData = data.add_personal_data[0];
    const familyBackground = data.family_background[0];
    const academicBackground = data.academic_background[0];
    const academicHistory = data.academic_history[0];

    // Fetch Program to get campus_id
    const program = await db.Program.findByPk(academicBackground.program, {
      include: [
        {
          model: db.Department,
          include: [
            {
              model: db.Campus,
            },
          ],
        },
      ],
    });

    if (!program) {
      throw new Error("Program not found");
    }

    const campus_id = program.department.campus.campus_id;

    // Fetch Semester
    const semester = await db.Semester.findByPk(
      academicBackground.semester_entry
    );

    if (!semester) {
      throw new Error("Semester not found");
    }

    // Get prospectus_id
    const prospectus = await db.Prospectus.findOne({
      where: {
        program_id: program.program_id,
        isActive: true,
        isDeleted: false,
      },
    });

    if (!prospectus) {
      throw new Error("Prospectus not found for the program");
    }

    const prospectus_id = prospectus.prospectus_id;

    // Start a transaction
    const transaction = await db.sequelize.transaction();

    try {
      // Create student_personal_data
      const studentPersonalData = await db.StudentPersonalData.create(
        {
          enrollmentType: personalData.on_site ? "on-site" : "online",
          applicant_id_for_online: personalData.fulldata_applicant_id,
          campus_id: campus_id,
          status: personalData.status,
          firstName: personalData.f_name,
          middleName: personalData.m_name,
          lastName: personalData.l_name,
          suffix: personalData.suffix,
          gender: personalData.sex,
          email: personalData.email,
          birthDate: personalData.birth_date,
          birthPlace: personalData.birth_place,
          civilStatus: personalData.marital_status,
          religion: personalData.religion,
          country: personalData.country,
          citizenship: addPersonalData.citizenship,
          ACR: personalData.acr,
          address:
            addPersonalData.city_address ||
            addPersonalData.province_address ||
            "",
          contactNumber: addPersonalData.contact_number || "",
          isActive: personalData.is_active,
          isDeleted: personalData.is_deleted,
        },
        {transaction}
      );

      const student_personal_id = studentPersonalData.student_personal_id;

      // Create student_add_personal_data
      await db.StudentAddPersonalData.create(
        {
          student_personal_id: student_personal_id,
          cityAddress: addPersonalData.city_address,
          provinceAddress: addPersonalData.province_address,
          cityTelNumber: addPersonalData.city_contact_number,
          provinceTelNumber: addPersonalData.province_contact_number,
          isActive: addPersonalData.is_active,
          isDeleted: addPersonalData.is_deleted,
        },
        {transaction}
      );

      // Create student_family
      await db.StudentFamily.create(
        {
          student_personal_id: student_personal_id,
          fatherFirstName: familyBackground.father_fname,
          fatherMiddleName: familyBackground.father_mname,
          fatherLastName: familyBackground.father_lname,
          fatherContactNumber: familyBackground.father_contact_number,
          fatherEmail: familyBackground.father_email,
          fatherOccupation: familyBackground.father_occupation,
          fatherIncome: familyBackground.father_income,
          fatherCompanyName: familyBackground.father_company,
          motherFirstName: familyBackground.mother_fname,
          motherMiddleName: familyBackground.mother_mname,
          motherLastName: familyBackground.mother_lname,
          motherContactNumber: familyBackground.mother_contact_number,
          motherEmail: familyBackground.mother_email,
          motherOccupation: familyBackground.mother_occupation,
          motherIncome: familyBackground.mother_income,
          motherCompanyName: familyBackground.mother_company,
          guardianFirstName: familyBackground.guardian_fname,
          guardianMiddleName: familyBackground.guardian_mname,
          guardianLastName: familyBackground.guardian_lname,
          guardianRelation: familyBackground.guardian_relation,
          guardianContactNumber: familyBackground.guardian_contact_number,
        },
        {transaction}
      );

      // Create student_academic_background
      await db.StudentAcademicBackground.create(
        {
          student_personal_id: student_personal_id,
          program_id: academicBackground.program,
          majorIn: academicBackground.major_in,
          studentType: academicBackground.student_type,
          applicationType: academicBackground.application_type,
          semester_id: academicBackground.semester_entry,
          prospectus_id: prospectus_id,
          yearLevel: academicBackground.year_level,
          yearEntry: academicBackground.year_entry,
          yearGraduate: academicBackground.year_graduate,
        },
        {transaction}
      );

      // Create student_academic_history
      await db.StudentAcademicHistory.create(
        {
          student_personal_id: student_personal_id,
          elementarySchool: academicHistory.elementary_school,
          elementaryAddress: academicHistory.elementary_address,
          elementaryHonors: academicHistory.elementary_honors,
          elementaryGraduate: academicHistory.elementary_graduate,
          secondarySchool: academicHistory.junior_highschool,
          secondaryAddress: academicHistory.junior_address,
          secondaryHonors: academicHistory.junior_honors,
          secondaryGraduate: academicHistory.junior_graduate,
          seniorHighSchool: academicHistory.senior_highschool,
          seniorHighAddress: academicHistory.senior_address,
          seniorHighHonors: academicHistory.senior_honors,
          seniorHighSchoolGraduate: academicHistory.senior_graduate,
          ncae_grade: academicHistory.ncae_grade,
          ncae_year_taken: academicHistory.ncae_year_taken,
          latest_college: academicHistory.latest_college,
          college_address: academicHistory.college_address,
          college_honors: academicHistory.college_honors,
          program: academicHistory.program,
        },
        {transaction}
      );

      // Commit transaction
      await transaction.commit();

      /*
      // After successful commit, make the PUT request
      const putUrl = `${MHAFRIC_API_URL}/api/deactivate_or_modify_personal-student-data/${fulldata_applicant_id}/False`;
      const putBody = {
        status: "initially enrolled",
      };

      try {
        const putResponse = await axios.put(putUrl, putBody);
        console.log(
          `PUT request successful: ${putResponse.status} ${putResponse.statusText}`
        );
      } catch (putError) {
        console.error("Error in PUT request:", putError.message);
        // Optional: Depending on your requirements, you might want to handle this differently.
        // For example, you could log it, retry, or notify someone.
      }
      */
    } catch (error) {
      // Rollback transaction
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error("Error in enrollOlineApplicantStudent:", error.message);
    throw error;
  }
}

async function getAllOnlineApplicant(campus_id = null) {
  try {
    // Construct the API URL with optional campus filter
    let url = `${MHAFRIC_API_URL}/api/full-student-data/`;
    if (campus_id) {
      url += `?filter=campus=${campus_id}`;
    }

    console.log(`Fetching data from URL: ${url}`);

    // Fetch data from the API
    const response = await axios.get(url);
    const data = response.data;

    console.log(`Total personal_data received: ${data.personal_data.length}`);

    // Filter applicants with status 'pending'
    const pendingApplicants = data.personal_data.filter(
      (applicant) => applicant.status === "pending"
    );

    console.log(`Total pending applicants: ${pendingApplicants.length}`);

    if (pendingApplicants.length === 0) {
      console.log("No pending applicants found.");
      return [];
    }

    // Process and map the filtered data to extract required fields
    const applicants = await Promise.all(
      pendingApplicants.map(async (applicant) => {
        const {
          f_name: firstName,
          m_name: middleName,
          l_name: lastName,
          suffix,
          on_site,
          status,
          fulldata_applicant_id,
        } = applicant;

        // Find academic background for the applicant
        const academic = data.academic_background.find(
          (item) => item.fulldata_applicant_id === fulldata_applicant_id
        );

        if (!academic) {
          console.warn(
            `No academic_background found for applicant ID: ${fulldata_applicant_id}`
          );
        }

        // Retrieve program information
        let programDetails = {};
        if (academic && academic.program) {
          const program = await db.Program.findOne({
            where: {program_id: academic.program},
            include: [
              {
                model: db.Department,
                include: [
                  {
                    model: db.Campus,
                  },
                ],
              },
            ],
          });

          if (program) {
            programDetails = {
              programCode: program.programCode,
              programDescription: program.programDescription,
              campus_id: program.department.campus.campus_id,
              campusName: program.department.campus.campusName,
            };
          } else {
            console.warn(
              `No program found for program_id: ${academic.program} (Applicant ID: ${fulldata_applicant_id})`
            );
          }
        } else {
          console.warn(
            `No program specified for academic_background of applicant ID: ${fulldata_applicant_id}`
          );
        }

        return {
          fulldata_applicant_id: fulldata_applicant_id,
          firstName: firstName,
          middleName: middleName,
          lastName: lastName,
          fullName: `${firstName} ${middleName || ""} ${lastName} ${
            suffix || ""
          }`.trim(),
          programCode: programDetails.programCode || null,
          programDescription: programDetails.programDescription || null,
          yearLevel: academic ? academic.year_level : null,
          on_site,
          status,
          enrollmentType: on_site ? "On-site" : "Online",
          campus_id: programDetails.campus_id || null,
          campusName: programDetails.campusName || null,
        };
      })
    );

    console.log(`Total mapped applicants: ${applicants.length}`);

    return applicants;
  } catch (error) {
    console.error("Error fetching online applicants:", error);
    throw new Error("Failed to retrieve online applicants");
  }
}

// ! For Student
async function getAllStudentsOfficial(campusName = null) {
  let campus;

  if (campusName) {
    campus = await db.Campus.findOne({
      where: {campusName},
    });

    if (!campus) {
      throw new Error(`Campus "${campusName}" not found`);
    }
  }

  // Fetch StudentOfficial records with necessary associations
  const students = await db.StudentOfficial.findAll({
    where: {
      ...(campus ? {campus_id: campus.campus_id} : {}),
      student_id: {
        [Op.like]: `${new Date().getFullYear()}%`,
      },
    },
    include: [
      {
        model: db.StudentPersonalData,
        include: [
          {
            model: db.StudentAcademicBackground,

            include: [
              {
                model: db.Program,
                include: [
                  {
                    model: db.Department,
                    attributes: ["department_id", "departmentName"],
                  },
                ],
                attributes: [
                  "program_id",
                  "programDescription",
                  "programCode",
                  "department_id",
                ],
              },
            ],
            attributes: [
              "majorIn",
              "studentType",
              "applicationType",
              "yearEntry",
              "yearLevel",
              "yearGraduate",
            ],
          },
        ],
        attributes: [
          "student_personal_id",
          "firstName",
          "middleName",
          "lastName",
          "email",
        ],
      },
      {
        model: db.Campus,

        attributes: ["campusName", "campus_id"],
      },
    ],
    attributes: ["student_id", "createdAt"], // Include other attributes as needed
  });

  console.log(`Fetched ${students.length} students.`);

  if (!students || students.length === 0) {
    return [];
  }

  // Log the first student to inspect the structure
  console.log("First student record:", JSON.stringify(students[0], null, 2));

  const studentsWithDepartment = [];

  students.forEach((student) => {
    // Access the associated StudentPersonalData
    const studentPersonalData = student.student_personal_datum; // Assuming underscored

    if (!studentPersonalData) {
      console.warn(
        `Warning: StudentPersonalData not found for student ID ${student.student_id}. Skipping this student.`
      );
      return; // Skip this student
    }

    const academicBackground =
      studentPersonalData.student_current_academicbackground; // Assuming model name is 'student_current_academicbackground'

    if (!academicBackground) {
      console.warn(
        `Warning: AcademicBackground not found for studentPersonalData ID ${studentPersonalData.student_personal_id}. Skipping student ID ${student.student_id}.`
      );
      return; // Skip this student
    }

    const program = academicBackground.program;

    if (!program) {
      console.warn(
        `Warning: Program not found for academicBackground ID associated with studentPersonalData ID ${studentPersonalData.student_personal_id}. Skipping student ID ${student.student_id}.`
      );
      return; // Skip this student
    }

    // Access the associated Department
    const department = program.department;

    if (!department) {
      console.warn(
        `Warning: Department not found for program ID ${program.program_id}. Skipping student ID ${student.student_id}.`
      );
      return; // Skip this student
    }

    console.log(
      `Mapping Student ID ${student.student_id} to Department ${department.departmentName}`
    );

    // Extract the personal data fields
    const {firstName, middleName, lastName, email} = studentPersonalData;

    studentsWithDepartment.push({
      ...student.toJSON(),
      department_id: department.department_id,
      departmentName: department.departmentName,
      campusName: student.campus ? student.campus.campusName : null,
      campus_id: student.campus ? student.campus.campus_id : null,
      firstName,
      middleName,
      lastName,
      email,
      programCode:
        student.student_personal_datum.student_current_academicbackground
          .program.programCode,
      yearLevel:
        student.student_personal_datum.student_current_academicbackground
          .yearLevel,
    });
  });

  console.log(
    `Mapped ${studentsWithDepartment.length} students with departments.`
  );

  return studentsWithDepartment;
}

async function getAllStudentOfficialCount(campusName = null) {
  let campus;

  // If campusName is provided, fetch the campus based on the campus name
  if (campusName) {
    campus = await db.Campus.findOne({
      where: {campusName},
    });

    // Check if the campus exists
    if (!campus) {
      throw new Error("Campus not found");
    }
  }

  // Count the students based on the provided campus or all students if campusName is null
  const studentCount = await db.StudentOfficial.count({
    where: {
      // Only filter by campus_id if a campus is found (i.e., campusName was provided)
      ...(campus ? {campus_id: campus.campus_id} : {}),
      student_id: {
        [Op.like]: `${new Date().getFullYear()}%`, // Adjust this condition as per your filtering needs
      },
    },
  });

  return studentCount;
}

function generateColor(baseColor) {
  let color = baseColor.replace("#", "");

  let dct = 30; // Distance to color threshold
  let darknessFactor = 0.25;

  // Generate random base color channels (r, g, b)
  let r = Math.floor(Math.random() * 256);
  let g = Math.floor(Math.random() * 256);
  let b = Math.floor(Math.random() * 256);

  // Introduce randomness to each channel to generate a dct color
  r = Math.min(255, Math.max(0, r + Math.floor(Math.random() * 100 - dct))); // Random variation within ±dct
  g = Math.min(255, Math.max(0, g + Math.floor(Math.random() * 100 - dct)));
  b = Math.min(255, Math.max(0, b + Math.floor(Math.random() * 100 - dct)));

  // Adjust the color based on the darkness factor
  r = Math.floor(r * (1 - darknessFactor));
  g = Math.floor(g * (1 - darknessFactor));
  b = Math.floor(b * (1 - darknessFactor));

  // Ensure the new color is not too close to grayscale
  if (Math.abs(r - g) < 30 && Math.abs(g - b) < 30 && Math.abs(b - r) < 30) {
    // Shift one channel drastically if too close to grayscale
    r = (r + 100) % 255;
  }

  // Return the new color in hexadecimal format
  return `#${((1 << 24) + (r << 16) + (g << 8) + b)
    .toString(16)
    .slice(1)}`.toUpperCase();
}

async function getChartData(campusName = null) {
  let campus;

  if (campusName) {
    campus = await db.Campus.findOne({
      where: {campusName},
    });

    if (!campus) {
      throw new Error(`Campus "${campusName}" not found`);
    }
  }

  // Fetch departments, optionally filtered by campus_id
  const departments = await db.Department.findAll({
    where: campus ? {campus_id: campus.campus_id} : {},
    include: [
      {
        model: db.Campus,
        // No alias used here
        attributes: ["campusName"],
        required: true, // Ensures only departments with campuses are fetched
      },
    ],
    attributes: ["department_id", "departmentCode", "departmentName"],
  });

  console.log(`Fetched ${departments.length} departments.`);

  if (!departments || departments.length === 0) {
    return {
      colors: ["#FF0000"],
      labels: [
        {
          departmentCode: "None",
          departmentCodeWithCampusName: "waley",
          departmentName: "Wala",
          departmentNameWithCampusName: "ambot",
        },
      ],
      series: [1],
      percentages: ["0"],
    };
  }

  // Fetch students with departments using the updated helper function
  const students = await getAllStudentsOfficial(campusName);

  console.log(`Total students after mapping: ${students.length}`);

  if (!students || students.length === 0) {
    return {
      colors: ["#FF0000"],
      labels: [
        {
          departmentCode: "None",
          departmentCodeWithCampusName: "waley",
          departmentName: "Wala",
          departmentNameWithCampusName: "ambot",
        },
      ],
      series: [1],
      percentages: ["0"],
    };
  }

  const baseColors = ["#3C50E0", "#6577F3", "#8FD0EF", "#0FADCF"];
  const chartData = {
    colors: [],
    labels: [],
    series: [],
    percentages: [],
  };

  const totalStudents = students.length;

  departments.forEach((department, index) => {
    const studentCount = students.filter(
      (student) => student.department_id === department.department_id
    ).length;

    const percentage = ((studentCount / totalStudents) * 100).toFixed(2);

    chartData.labels.push({
      departmentCode: department.departmentCode,
      departmentName: department.departmentName,
      departmentCodeWithCampusName: campusName
        ? `${department.departmentCode} (${department.campus.campusName})`
        : department.departmentCode,
      departmentNameWithCampusName: campusName
        ? `${department.departmentName} (${department.campus.campusName})`
        : department.departmentName,
    });
    chartData.series.push(studentCount);
    chartData.percentages.push(percentage);

    const newColor = generateColor(baseColors[index % baseColors.length]);
    chartData.colors.push(newColor);
  });

  console.log("Generated chart data:", chartData);

  return chartData;
}

// Generate new color if the index exceeds the baseColors length
// if (index < baseColors.length) {
//   chartData.colors.push(baseColors[index]);
// } else {
//   const newColor = generateColor(baseColors[index % baseColors.length]);
//   chartData.colors.push(newColor);
// }

async function getStudentAcademicBackground(id) {
  const studentAcademicBackground = await db.StudentAcademicBackground.findOne({
    where: {
      student_personal_id: id,
    },
  });

  if (!studentAcademicBackground) {
    throw new Error("Student academic background not found.");
  }

  return studentAcademicBackground;
}

async function getAllStudentsOfficalActive() {
  const students = await db.StudentOfficial.count({
    where: {
      isActive: true,
    },
  });
  return students;
}

async function getStudentById(id) {
  const student = await db.StudentOfficial.findByPk(id);
  if (!student) throw "Student not found";
  return student;
}

async function updateStudent(id, params) {
  const student = await getStudentById(id);

  if (!student) throw "Student not found";

  Object.assign(student, params);
  await student.save();
}

/*

  ! For Enrollment Process

*/

async function updateEnrollmentProcess(params) {
  const {
    student_personal_id,
    status,
    payment_confirmed,
    allRoles,
    specificRole,
  } = params;

  // Ensure the required parameters are present
  if (!student_personal_id || !status || !specificRole || !allRoles) {
    throw new Error(
      "Applicant ID, status, specific role, and all roles are required."
    );
  }

  // Convert the comma-separated roles string into an array
  const userRoles = allRoles.split(",").map((r) => r.trim());

  // Check if the user has the Admin role
  const isAdmin = userRoles.includes(Role.Admin);

  // If the user is not an Admin, verify they have the specific role
  if (!isAdmin && !userRoles.includes(specificRole)) {
    throw new Error(`User does not have the role: ${specificRole}`);
  }

  // Proceed with the rest of the function as Admin can perform any role's actions
  // while non-Admins must have the specific role.

  // Check if the applicant exists in the database
  const applicant = await db.StudentPersonalData.findByPk(student_personal_id);
  if (!applicant) {
    throw new Error(`Applicant with ID ${student_personal_id} does not exist.`);
  }

  // Fetch the active semester
  const activeSemester = await db.Semester.findOne({
    where: {
      isActive: true,
      isDeleted: false,
      campus_id: applicant.campus_id, // Assuming campus_id is associated with the student
    },
  });

  if (!activeSemester) {
    throw new Error("No active semester found.");
  }

  // Fetch the current enrollment process for the applicant and active semester
  let enrollmentProcess = await db.EnrollmentProcess.findOne({
    where: {
      student_personal_id: student_personal_id,
      semester_id: activeSemester.semester_id,
    },
  });

  if (!enrollmentProcess) {
    // If no existing process found, create a new record with default statuses
    enrollmentProcess = await db.EnrollmentProcess.create({
      student_personal_id: student_personal_id,
      semester_id: activeSemester.semester_id,
      registrar_status: "in-progress",
      accounting_status: "upcoming",
      payment_confirmed: false, // Set payment to false initially
      final_approval_status: false, // Final approval starts as false
    });
  }

  // Validation: Prevent any changes if final_approval_status is true
  if (enrollmentProcess.final_approval_status === true) {
    throw new Error(
      "The enrollment process is already final-approved. No further changes are allowed."
    );
  }

  // Get the current date to track when statuses are updated
  const currentDate = new Date();

  // Step 1: Handle the specific role update based on the provided specificRole
  switch (specificRole) {
    case Role.Registrar:
      // Registrar can accept or reject
      if (status === "accepted" || status === "rejected") {
        enrollmentProcess.registrar_status = status;
        enrollmentProcess.registrar_status_date = currentDate;
      } else {
        throw new Error(
          "Invalid status for Registrar. Only 'accepted' or 'rejected' are allowed."
        );
      }

      // If Registrar rejects, stop the process
      if (status === "rejected") {
        await enrollmentProcess.save();
        return {
          message:
            "Registrar has rejected the application. Enrollment process cannot continue.",
        };
      }

      // If Registrar accepts, Accounting status moves to "in-progress"
      if (status === "accepted") {
        enrollmentProcess.accounting_status = "in-progress";
      }
      break;

    case Role.Accounting:
      // Ensure Registrar has accepted before Accounting can proceed
      if (enrollmentProcess.registrar_status !== "accepted") {
        throw new Error(
          "Registrar must accept the application before Accounting can proceed."
        );
      }

      // Ensure payment confirmation is valid only for Accounting
      if (payment_confirmed && status !== "accepted") {
        throw new Error(
          "Payment can only be confirmed when status is 'accepted' by Accounting."
        );
      }

      // Update the accounting status and payment confirmation
      if (status === "accepted") {
        enrollmentProcess.accounting_status = status;
        enrollmentProcess.accounting_status_date = currentDate;
        enrollmentProcess.payment_confirmed = payment_confirmed || false;
      } else if (status === "rejected") {
        enrollmentProcess.accounting_status = status;
        await enrollmentProcess.save();
        return {
          message:
            "Accounting has rejected the application. Enrollment process cannot continue.",
        };
      } else {
        throw new Error(
          "Invalid status for Accounting. Only 'accepted' or 'rejected' are allowed."
        );
      }
      break;

    default:
      throw new Error(
        `Invalid role: ${specificRole} for updating the enrollment process.`
      );
  }

  // Step 2: Save the updated enrollment process
  await enrollmentProcess.save();

  // Step 3: Check if all approvals are accepted and ready to enroll the student
  if (
    enrollmentProcess.registrar_status === "accepted" &&
    enrollmentProcess.accounting_status === "accepted" &&
    enrollmentProcess.payment_confirmed
  ) {
    // Enroll the student by calling enrollOlineApplicantStudentMockUpOnsite
    await enrollOlineApplicantStudentMockUpOnsite(
      student_personal_id,
      activeSemester.semester_id
    );

    // Update final approval status
    enrollmentProcess.final_approval_status = true;
    enrollmentProcess.final_approval_date = currentDate;
    await enrollmentProcess.save();

    return {
      message:
        "Registrar and Accounting have accepted. Student is now fully enrolled.",
      readyForFinalApproval: true,
    };
  }

  return {
    message: "Enrollment process updated.",
  };
}

async function getAllEnrollmentStatus(
  campus_id = null,
  registrar_status = null,
  accounting_status = null,
  final_approval_status = null,
  payment_confirmed = null,
  schoolYear = null,
  semester_id = null
) {
  try {
    // Build the where clause for EnrollmentProcess based on status filters
    const enrollmentWhere = {};
    if (registrar_status) {
      enrollmentWhere.registrar_status = {[Op.eq]: registrar_status};
    }
    if (accounting_status) {
      enrollmentWhere.accounting_status = {[Op.eq]: accounting_status};
    }
    if (final_approval_status !== null && final_approval_status !== undefined) {
      enrollmentWhere.final_approval_status = {[Op.eq]: final_approval_status};
    }
    if (payment_confirmed !== null && payment_confirmed !== undefined) {
      let paymentConfirmedBool;
      if (typeof payment_confirmed === "boolean") {
        paymentConfirmedBool = payment_confirmed;
      } else if (typeof payment_confirmed === "string") {
        paymentConfirmedBool = payment_confirmed.toLowerCase() === "true";
      }

      if (typeof paymentConfirmedBool === "boolean") {
        enrollmentWhere.payment_confirmed = {
          [Op.eq]: paymentConfirmedBool,
        };
      }
    }
    if (semester_id) {
      enrollmentWhere.semester_id = semester_id;
    }

    // Build the where clause for StudentPersonalData based on campus_id
    const studentWhere = {};
    if (campus_id) {
      studentWhere.campus_id = {[Op.eq]: campus_id};
    }

    // Fetch enrollment statuses with necessary includes
    const enrollmentStatuses = await db.EnrollmentProcess.findAll({
      where: enrollmentWhere,
      include: [
        {
          model: db.StudentPersonalData,
          attributes: [
            "student_personal_id",
            "firstName",
            "lastName",
            "middleName",
            "email",
            "campus_id",
          ],
          where: studentWhere,
          required: true,
          include: [
            {
              model: db.StudentAcademicBackground,
              as: "student_current_academicbackground",
              attributes: [
                "id",
                "program_id",
                "studentType",
                "applicationType",
                "semester_id",
                "yearLevel",
              ],
              required: true,
              include: [
                {
                  model: db.Program,
                  attributes: ["programCode", "programDescription"],
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
                },
                {
                  model: db.Semester,
                  attributes: ["semester_id", "schoolYear", "semesterName"],
                  required: true,
                  where: schoolYear ? {schoolYear} : {},
                },
              ],
            },
          ],
        },
        {
          model: db.Semester,
          attributes: ["semester_id", "schoolYear", "semesterName"],
          required: true,
          where: semester_id ? {semester_id} : schoolYear ? {schoolYear} : {},
        },
      ],
      order: [["enrollment_id", "ASC"]],
    });

    return enrollmentStatuses.map((status) => ({
      ...status.toJSON(),
      fullName: `${status.student_personal_datum.firstName} ${
        status.student_personal_datum.middleName
          ? status.student_personal_datum.middleName[0] + ". "
          : ""
      }${status.student_personal_datum.lastName}`,
      student_personal_id: status.student_personal_datum.student_personal_id,
      programCode:
        status.student_personal_datum.student_current_academicbackground.program
          .programCode,
      programDescription:
        status.student_personal_datum.student_current_academicbackground.program
          .programDescription,
      departmentCode:
        status.student_personal_datum.student_current_academicbackground.program
          .department.departmentCode,
      departmentName:
        status.student_personal_datum.student_current_academicbackground.program
          .department.departmentName,
      campusName:
        status.student_personal_datum.student_current_academicbackground.program
          .department.campus.campusName,
      schoolYear:
        status.student_personal_datum.student_current_academicbackground
          .semester.schoolYear,
      semesterName:
        status.student_personal_datum.student_current_academicbackground
          .semester.semesterName,
    }));
  } catch (error) {
    console.error("Error in getAllEnrollmentStatus:", error.message);
    throw error;
  }
}

// Get enrollment status by applicant ID
async function getEnrollmentStatusById(enrollment_id) {
  const enrollmentStatus = await db.EnrollmentProcess.findOne({
    where: {enrollment_id},
    include: [
      {
        model: db.StudentPersonalData,
        attributes: ["firstName", "lastName", "email"],
        include: [
          {
            model: db.StudentAcademicBackground,
            include: [
              {
                model: db.Program,
                attributes: ["programCode", "programDescription"],
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
              },
            ],
          },
        ],
      },
    ],
  });

  console.log("Enrollment Status: ", enrollmentStatus.toJSON());

  if (!enrollmentStatus) {
    throw new Error(`Enrollment status not found for ID ${enrollment_id}`);
  }

  const studentPersonalData = enrollmentStatus.student_personal_datum;
  console.log("\n\nstudentPersonalData:", studentPersonalData.toJSON());
  const academicBackground =
    studentPersonalData.student_current_academicbackground;
  console.log("\n\nacademicBackground:", academicBackground.toJSON());
  const program = academicBackground?.program;
  const department = program?.department;
  const campus = department?.campus;

  return {
    ...enrollmentStatus.toJSON(),
    applicant: {
      firstName: studentPersonalData.firstName,
      lastName: studentPersonalData.lastName,
      email: studentPersonalData.email,
      programCode: program?.programCode || "Program code not found",
      departmentName: department?.departmentName || "Department not found",
      campusName: campus?.campusName || "Campus not found",
    },
  };
}

// ! Get Student Enrolled Classes

async function getStudentEnrolledClasses(
  student_personal_id,
  student_id,
  semester_id,
  status = "enrolled"
) {
  let studentOfficialWhere =
    student_personal_id && !student_id
      ? {student_personal_id}
      : student_id && {student_id};

  // Step 1: Fetch the student's official student ID
  const studentOfficial = await db.StudentOfficial.findOne({
    where: studentOfficialWhere,
    attributes: ["student_id", "student_personal_id"],
  });

  // Use student_personal_id from studentOfficial if exists, else use the passed-in student_personal_id
  const personalIdToUse = studentOfficial
    ? studentOfficial.student_personal_id
    : student_personal_id;

  // Step 2: Fetch the student's class enrollments
  const enrolledClasses = await db.StudentClassEnrollments.findAll({
    where: {
      student_personal_id: personalIdToUse,
      status,
    },
  });

  // Check if there are any enrolled classes
  if (!enrolledClasses || enrolledClasses.length === 0) {
    return []; // Return an empty array if no classes are found
  }

  // Extract class_ids from enrollments
  const enrolledClassIds = enrolledClasses.map(
    (enrollment) => enrollment.class_id
  );

  // Step 3: Fetch classes from external API
  let externalClasses;
  try {
    const response = await axios.get(
      `${SCHEDULING_API_URL}/teachers/all-subjects`
    );
    externalClasses = response.data; // Assuming the API returns an array of class objects
  } catch (error) {
    console.error("Error fetching classes from external API:", error);
    throw new Error("Failed to fetch classes from the external source.");
  }

  // Step 4: Filter external classes by semester_id
  const filteredClasses = externalClasses.filter(
    (cls) => cls.semester_id === semester_id
  );

  // Step 5: Match the student's enrolled classes with external classes
  const matchedClasses = filteredClasses.filter((cls) =>
    enrolledClassIds.includes(cls.id)
  );

  if (matchedClasses.length === 0) {
    return []; // No matched classes found
  }

  // Step 6: Extract unique IDs for bulk fetching
  const teacherIds = [...new Set(matchedClasses.map((cls) => cls.teacher_id))];
  const subjectIds = [...new Set(matchedClasses.map((cls) => cls.subject_id))];
  const semesterIds = [
    ...new Set(matchedClasses.map((cls) => cls.semester_id)),
  ];

  // Step 7: Fetch related data from the database
  const [employees, courseInfos, semesters] = await Promise.all([
    db.Employee.findAll({
      where: {employee_id: {[Op.in]: teacherIds}},
      attributes: [
        "employee_id",
        "title",
        "firstName",
        "middleName",
        "lastName",
        "role",
        "qualifications",
      ],
    }),
    db.CourseInfo.findAll({
      where: {course_id: {[Op.in]: subjectIds}},
      attributes: ["course_id", "courseCode", "courseDescription", "unit"],
    }),
    db.Semester.findAll({
      where: {semester_id: {[Op.in]: semesterIds}},
      attributes: ["semester_id", "schoolYear", "semesterName"],
    }),
  ]);

  // Create maps for quick lookup
  const employeeMap = new Map();
  employees.forEach((emp) => {
    employeeMap.set(emp.employee_id, emp);
  });

  const courseInfoMap = new Map();
  courseInfos.forEach((course) => {
    courseInfoMap.set(course.course_id, course);
  });

  const semesterMap = new Map();
  semesters.forEach((sem) => {
    semesterMap.set(sem.semester_id, sem);
  });

  // Step 8: Map the data to include only the necessary fields
  const result = matchedClasses.map((cls) => {
    const courseInfo = courseInfoMap.get(cls.subject_id);
    const semester = semesterMap.get(cls.semester_id);
    const instructor = employeeMap.get(cls.teacher_id);

    // Handle roles
    let roles =
      instructor && instructor.role
        ? instructor.role.split(",").map((r) => r.trim())
        : [];

    const validRoles = [
      "SuperAdmin",
      "Admin",
      "MIS",
      "Registrar",
      "DataCenter",
      "Dean",
      "Accounting",
    ];

    // Filter roles to keep only valid ones
    const forValidRoles = roles.filter((role) => validRoles.includes(role));

    // Get the first valid role if available
    const firstValidRole = roles.length > 0 ? roles[0] : null;

    // Handle qualifications, parse the string into an array if needed
    let qualificationsArray = [];
    if (instructor && typeof instructor.qualifications === "string") {
      try {
        qualificationsArray = JSON.parse(instructor.qualifications);
      } catch (error) {
        console.error("Error parsing qualifications:", error);
        qualificationsArray = []; // Handle the error by returning an empty array
      }
    } else if (instructor && Array.isArray(instructor.qualifications)) {
      qualificationsArray = instructor.qualifications;
    }

    // Check if qualifications exist and map the abbreviations
    const qualifications =
      qualificationsArray.length > 0
        ? `, (${qualificationsArray.map((q) => q.abbreviation).join(", ")})`
        : "";

    // Construct instructor names
    const instructorFullName = instructor
      ? `${instructor.title} ${instructor.firstName}${
          instructor.middleName ? ` ${instructor.middleName[0]}.` : ""
        } ${instructor.lastName}${qualifications}`
      : null;

    const instructorFullNameWithRole = instructor
      ? `${instructor.title} ${instructor.firstName}${
          instructor.middleName ? ` ${instructor.middleName[0]}.` : ""
        } ${instructor.lastName}${qualifications} - ${
          firstValidRole ? firstValidRole : forValidRoles.join(", ")
        }`
      : null;

    const instructorName = instructor
      ? `${instructor.firstName}${
          instructor.middleName ? ` ${instructor.middleName[0]}.` : ""
        } ${instructor.lastName}`
      : null;

    return {
      student_id: studentOfficial ? studentOfficial.student_id : null,
      student_personal_id: personalIdToUse,
      class_id: cls.id,
      course_id: courseInfo ? courseInfo.course_id : null,
      semester_id: semester ? semester.semester_id : null,
      employee_id: instructor ? instructor.employee_id : null,

      className: cls.subject, // Assuming 'subject' represents the class name
      subjectCode: cls.subject_code,
      subjectDescription: courseInfo
        ? courseInfo.courseDescription
        : cls.subject,
      unit: courseInfo ? courseInfo.unit : cls.units,
      schoolYear: cls.school_year,
      semesterName: semester ? semester.semesterName : cls.semester,
      instructorFullName,
      instructorFullNameWithRole,
      instructorName,
    };
  });

  return result;
}

async function getAllEnrolledClasses(semester_id) {
  try {
    // Step 1: Fetch all classes from the external API once
    let allExternalClasses;
    try {
      const response = await axios.get(
        "https://benedicto-scheduling-backend.onrender.com/teachers/all-subjects"
      );
      allExternalClasses = response.data; // Assuming the API returns an array of class objects
    } catch (error) {
      console.error("Error fetching classes from external API:", error);
      throw new Error("Failed to fetch classes from the external source.");
    }

    // Step 2: Filter classes based on semester_id to emulate the original where clause on db.Class
    const filteredClasses = semester_id
      ? allExternalClasses.filter((cls) => cls.semester_id === semester_id)
      : allExternalClasses;

    // Extract class_ids from filtered classes
    const filteredClassIds = filteredClasses.map((cls) => cls.id);

    // Step 3: Fetch all class enrollments with status 'enrolled' for the given semester
    const enrolledClasses = await db.StudentClassEnrollments.findAll({
      where: {
        status: "enrolled",
        class_id: {[Op.in]: filteredClassIds}, // Match class IDs from external API
      },
      include: [
        {
          model: db.StudentPersonalData,
          include: [
            {
              model: db.StudentOfficial,
              attributes: ["student_id"],
            },
          ],
          attributes: [
            "student_personal_id",
            "firstName",
            "middleName",
            "lastName",
            "suffix",
          ],
        },
        // Removed db.Class from includes
        // We'll handle class details using the external API data
      ],
    });

    // Log the first enrolled class for debugging purposes
    if (enrolledClasses.length > 0) {
      console.log(enrolledClasses[0].toJSON());
    }

    // Step 4: Create a map of class_id to class object for quick lookup
    const externalClassesMap = new Map();
    filteredClasses.forEach((cls) => {
      externalClassesMap.set(cls.id, cls);
    });

    // Step 5: Extract unique IDs for bulk fetching related data
    const teacherIds = [
      ...new Set(filteredClasses.map((cls) => cls.teacher_id)),
    ];
    const subjectIds = [
      ...new Set(filteredClasses.map((cls) => cls.subject_id)),
    ];
    const semesterIds = [
      ...new Set(filteredClasses.map((cls) => cls.semester_id)),
    ];

    // Step 6: Fetch related data in bulk to optimize performance
    const [employees, courseInfos, semesters, buildings] = await Promise.all([
      db.Employee.findAll({
        where: {employee_id: {[Op.in]: teacherIds}},
        attributes: [
          "employee_id",
          "title",
          "firstName",
          "middleName",
          "lastName",
          "role",
          "qualifications",
        ],
      }),
      db.CourseInfo.findAll({
        where: {course_id: {[Op.in]: subjectIds}},
        attributes: ["course_id", "courseCode", "courseDescription", "unit"],
      }),
      db.Semester.findAll({
        where: {semester_id: {[Op.in]: semesterIds}},
        attributes: ["semester_id", "schoolYear", "semesterName"],
      }),
    ]);

    // Step 7: Create maps for quick lookup
    const employeeMap = new Map();
    employees.forEach((emp) => {
      employeeMap.set(emp.employee_id, emp);
    });

    const courseInfoMap = new Map();
    courseInfos.forEach((course) => {
      courseInfoMap.set(course.course_id, course);
    });

    const semesterMap = new Map();
    semesters.forEach((sem) => {
      semesterMap.set(sem.semester_id, sem);
    });

    // Step 8: Map the enrolled classes to include necessary fields without db.Class
    const result = enrolledClasses.map((enrollment) => {
      const student = enrollment.student_personal_datum;
      const studentOfficial = student.student_official;
      const class_id = enrollment.class_id;
      const externalClass = externalClassesMap.get(class_id);

      if (!externalClass) {
        // If external class data is not found, skip enrichment
        return {
          student_class_id: enrollment.student_class_enrollment_id,
          student_id: studentOfficial ? studentOfficial.student_id : null,
          student_personal_id: student.student_personal_id,
          class_id: class_id,
          course_id: null,
          semester_id: null,
          employee_id: null,

          studentName: `${student.firstName} ${student.middleName || ""} ${
            student.lastName
          } ${student.suffix || ""}`.trim(),
          className: null,
          subjectCode: null,
          subjectDescription: null,
          unit: null,
          schoolYear: null,
          semesterName: null,

          instructorFullName: null,
          instructorFullNameWithRole: null,
          instructorName: null,
        };
      }

      const courseInfo = courseInfoMap.get(externalClass.subject_id);
      const semester = semesterMap.get(externalClass.semester_id);
      const instructor = employeeMap.get(externalClass.teacher_id);

      // Handle roles
      let roles =
        instructor && instructor.role
          ? instructor.role.split(",").map((r) => r.trim())
          : [];

      const validRoles = [
        "SuperAdmin",
        "Admin",
        "MIS",
        "Registrar",
        "DataCenter",
        "Dean",
        "Accounting",
      ];

      // Filter roles to keep only valid ones
      const forValidRoles = roles.filter((role) => validRoles.includes(role));

      // Get the first valid role if available
      const firstValidRole = forValidRoles.length > 0 ? forValidRoles[0] : null;

      // Handle qualifications, parse the string into an array if needed
      let qualificationsArray = [];
      if (typeof instructor.qualifications === "string") {
        try {
          qualificationsArray = JSON.parse(instructor.qualifications);
        } catch (error) {
          console.error("Error parsing qualifications:", error);
          qualificationsArray = []; // Handle the error by returning an empty array
        }
      } else if (Array.isArray(instructor.qualifications)) {
        qualificationsArray = instructor.qualifications;
      }

      // Check if qualifications exist and map the abbreviations
      const qualifications =
        qualificationsArray.length > 0
          ? `, (${qualificationsArray.map((q) => q.abbreviation).join(", ")})`
          : "";

      // Construct instructor names
      const instructorFullName = instructor
        ? `${instructor.title} ${instructor.firstName}${
            instructor.middleName ? ` ${instructor.middleName[0]}.` : ""
          } ${instructor.lastName}${qualifications}`
        : null;

      const instructorFullNameWithRole = instructor
        ? `${instructor.title} ${instructor.firstName}${
            instructor.middleName ? ` ${instructor.middleName[0]}.` : ""
          } ${instructor.lastName}${qualifications} - ${
            firstValidRole ? firstValidRole : forValidRoles.join(", ")
          }`
        : null;

      const instructorName = instructor
        ? `${instructor.firstName}${
            instructor.middleName ? ` ${instructor.middleName[0]}.` : ""
          } ${instructor.lastName}`
        : null;

      // Construct room information
      const roomInfo = {
        room_number: externalClass.room,
      };

      return {
        student_class_id: enrollment.student_class_enrollment_id,
        student_id: studentOfficial ? studentOfficial.student_id : null,
        student_personal_id: student.student_personal_id,
        class_id: class_id,
        course_id: courseInfo ? courseInfo.course_id : null,
        semester_id: semester ? semester.semester_id : null,
        employee_id: instructor ? instructor.employee_id : null,

        studentName: `${student.firstName} ${student.middleName || ""} ${
          student.lastName
        } ${student.suffix || ""}`.trim(),
        className: externalClass.subject, // Assuming 'subject' represents the class name
        subjectCode: courseInfo ? courseInfo.courseCode : null,
        subjectDescription: courseInfo
          ? courseInfo.courseDescription
          : externalClass.subject,
        unit: courseInfo ? courseInfo.unit : externalClass.units,
        schoolYear: semester ? semester.schoolYear : externalClass.school_year,
        semesterName: semester ? semester.semesterName : externalClass.semester,
        roomInfo,

        instructorFullName: instructorFullName || null,
        instructorFullNameWithRole: instructorFullNameWithRole || null,
        instructorName: instructorName || null,
      };
    });

    return result;
  } catch (error) {
    console.error("Error in getAllEnrolledClasses:", error.message);
    throw new Error(`Failed to retrieve enrolled classes: ${error.message}`);
  }
}

async function getEnlistedClasses(id, external = false) {
  let student_personal_id = id;

  // Step 1: Resolve student_personal_id if external
  if (external) {
    const studentData = await db.StudentPersonalData.findOne({
      where: {applicant_id_for_online: id},
    });

    if (!studentData) {
      throw new Error("Invalid fulldata_applicant_id. Student not found.");
    }

    student_personal_id = studentData.student_personal_id;
  }

  // Step 2: Fetch all classes from the external API
  let externalClasses;
  try {
    const response = await axios.get(
      `${SCHEDULING_API_URL}/teachers/all-subjects`
    );
    externalClasses = response.data; // Assuming the API returns an array of class objects
  } catch (error) {
    console.error("Error fetching classes from external API:", error);
    throw new Error("Failed to fetch classes from the external source.");
  }

  // Step 3: Fetch enlisted classes from the database
  const enlistedClassEnrollments = await db.StudentClassEnrollments.findAll({
    where: {
      student_personal_id: student_personal_id,
      status: "enlisted",
    },
  });

  // Extract class_ids from enrollments
  const enrolledClassIds = enlistedClassEnrollments.map(
    (enrollment) => enrollment.class_id
  );

  // Step 4: Match enrolled class_ids with external classes
  const matchedClasses = externalClasses.filter((cls) =>
    enrolledClassIds.includes(cls.id)
  );

  if (matchedClasses.length === 0) {
    return []; // No matched classes found
  }

  // Step 5: Extract unique IDs for bulk fetching
  const teacherIds = [...new Set(matchedClasses.map((cls) => cls.teacher_id))];
  const subjectIds = [...new Set(matchedClasses.map((cls) => cls.subject_id))];
  const semesterIds = [
    ...new Set(matchedClasses.map((cls) => cls.semester_id)),
  ];

  // Step 6: Fetch related data in bulk to optimize performance
  const [employees, courseInfos, semesters] = await Promise.all([
    db.Employee.findAll({
      where: {employee_id: teacherIds},
    }),
    db.CourseInfo.findAll({
      where: {course_id: subjectIds},
    }),
    db.Semester.findAll({
      where: {semester_id: semesterIds},
    }),
  ]);

  // Create maps for quick lookup
  const employeeMap = new Map();
  employees.forEach((emp) => {
    employeeMap.set(emp.employee_id, emp);
  });

  const courseInfoMap = new Map();
  courseInfos.forEach((course) => {
    courseInfoMap.set(course.course_id, course);
  });

  const semesterMap = new Map();
  semesters.forEach((sem) => {
    semesterMap.set(sem.semester_id, sem);
  });

  // Step 7: Map the matched classes to the desired format, including student_personal_id
  const classes = matchedClasses.map((cls) => {
    const employee = employeeMap.get(cls.teacher_id);
    const courseInfo = courseInfoMap.get(cls.subject_id);
    const semester = semesterMap.get(cls.semester_id);

    return {
      student_personal_id, // Include student_personal_id in each class object
      class_id: cls.id,
      className: cls.subject, // Assuming 'subject' represents the class name
      subjectCode: cls.subject_code,
      subjectDescription: cls.subject, // Adjust if there's a different field for description
      units: cls.units,
      room: cls.room,
      schedule: {
        start: cls.start,
        end: cls.end,
        day: cls.day,
        recurrencePattern: cls.recurrencePattern,
      },
      background: cls.background,
      instructorFullName: employee
        ? `${employee.firstName} ${employee.lastName}`
        : "Unknown",
      courseinfo: courseInfo, // Includes detailed course information
      semester: semester, // Includes semester details
      school_year: cls.school_year,
      // Add other fields from the API response or related models as needed
    };
  });

  return classes;
}
