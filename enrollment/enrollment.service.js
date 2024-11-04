const {Op, where} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

const axios = require("axios");

const deepEqual = require("deep-equal");

require("dotenv").config();

module.exports = {
  submitApplication,
  submitEnlistment,

  updateEnrollmentProcess,
  getAllEnrollmentStatus,
  getEnrollmentStatusById,

  enrollStudent,
  getAllStudentsOfficial,
  getAllStudentsOfficalActive,
  getAllStudentOfficialCount,
  getChartData,
  getStudentAcademicBackground,

  getStudentById,
  updateStudent,
  // deleteStudent,

  fetchApplicantData,
  getAllApplicant,
  getAllApplicantCount,
};

const url = process.env.MHAFRIC_API;

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
        registrar_status: "accepted",
        registrar_status_date: new Date(),
        accounting_status: "upcoming",
        payment_confirmed: false,
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

async function submitEnlistment(params, accountId) {
  const {student_personal_id, class_ids} = params;

  const transaction = await db.sequelize.transaction();

  try {
    // Ensure the student exists
    const student = await db.StudentPersonalData.findByPk(student_personal_id);
    if (!student) {
      throw new Error("Student not found.");
    }

    // Create entries in student_class_enrollments table
    const studentClassEnrollmentsData = class_ids.map((class_id) => ({
      student_personal_id,
      class_id,
      status: "enlisted",
    }));

    await db.StudentClassEnrollments.bulkCreate(studentClassEnrollmentsData, {
      transaction,
    });

    // Commit the transaction
    await transaction.commit();

    // Optionally, log the action in history

    return;
  } catch (error) {
    await transaction.rollback();
    throw new Error(error.message);
  }
}

// async function enrollStudent(params, accountId) {
async function enrollStudent(params) {
  const studentparams = {};
  let campus_name = "";

  console.log(params);

  if (!params.applicant_id) {
    throw new Error("Applicant ID is required");
  }

  // Fetch the applicant data
  const request = await axios.get(`${url}/api/stdntbasicinfoapplication`, {
    params: {
      filter: `applicant_id=${params.applicant_id}`,
    },
  });

  if (request.data[0].status === "accepted") {
    throw new Error(
      `Student "${request.data[0].first_name} ${request.data[0].last_name}" is Already Enrolled`
    );
  }

  // Check if data exists
  if (request.data && request.data.length > 0) {
    const applicantData = request.data[0]; // Assuming the relevant data is in the first object

    // Mapping response data to studentparams
    studentparams.firstName = applicantData.first_name;
    studentparams.middleName = applicantData.middle_name;
    studentparams.lastName = applicantData.last_name;
    studentparams.isTransferee = applicantData.is_transferee;
    studentparams.yearLevel = applicantData.year_level;
    studentparams.contactNumber = applicantData.contact_number;
    studentparams.birthDate = applicantData.birth_date;

    // Mapping other fields
    studentparams.suffix = applicantData.suffix;
    studentparams.address = applicantData.address;
    studentparams.program = applicantData.program;
    studentparams.gender = applicantData.sex;
    studentparams.email = applicantData.email;
    studentparams.status = applicantData.status;

    campus_name = applicantData.campus;
  } else {
    // Throw error if no results are found
    throw new Error("No Results in response");
  }

  // Fetch the campus based on the campus name
  const campus = await db.Campus.findOne({where: {campusName: campus_name}});

  // Check if campus exists
  if (!campus) {
    throw new Error("Campus not found");
  }

  // Assign campus_id to studentparams
  studentparams.campus_id = campus.campus_id;

  // Generate student ID
  studentparams.student_id = await generateStudentId(
    // studentparams.program,
    campus_name
  );

  // New POST request after generating the student ID
  const postResponse = await axios.post(
    `${url}/api/stdntbasicinfo/`,
    {
      student_id: studentparams.student_id,
      applicant_id: params.applicant_id,
      pswrd: studentparams.student_id,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!postResponse.data) {
    throw new Error("Bad Request");
  }

  console.log("Post response:", postResponse.data);

  // New PUT request after the POST request
  const putResponse = await axios.put(
    `${url}/api/stdntbasicinfomod/${params.applicant_id}/false`,
    {
      status: "accepted",
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!putResponse.data) {
    throw new Error("Bad Request");
  }

  console.log("PUT response (status update):", putResponse.data);

  studentparams.status = "accepted";

  // Save student details in the database
  const studentOfficial = new db.StudentOfficial(studentparams);
  await studentOfficial.save();
}

async function enrollStudentMockUpOnsite(student_personal_id) {
  const transaction = await db.sequelize.transaction();

  try {
    // Fetch the applicant data along with necessary associations
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

    console.log(applicant.toJSON());

    if (!applicant) {
      throw new Error("Applicant not found");
    }

    // Check if the student is already enrolled
    if (applicant.status === "enrolled") {
      throw new Error("Student is already enrolled");
    }

    // Generate student ID if not already generated
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

    // Update the student's status to 'enrolled' in StudentPersonalData
    applicant.status = "enrolled";
    await applicant.save({transaction});

    // Get the student's prospectus ID and semester ID
    const {prospectus_id, semester_id} =
      applicant.student_current_academicbackground;

    // Find class enrollments for the specific semester
    const classEnrollments = await db.StudentClassEnrollments.findAll({
      where: {student_personal_id, status: "enlisted"},
      include: [
        {
          model: db.Class,
          where: {semester_id},
          include: [{model: db.CourseInfo}],
        },
      ],
      transaction,
    });

    console.log(classEnrollments[0].toJSON());

    const onlineFullStudentInfoPOST = await axios.post(
      `${url}/api/onsite-full-student-data/`,
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
          city_contact_number: applicant.addPersonalData?.cityTelNumber || null,
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
          year_level:
            // applicant.student_current_academicbackground?.yearLevel &&
            // applicant.student_current_academicbackground?.yearLevel.length > 8
            //   ? "4th Year"
            //   : applicant.student_current_academicbackground?.yearLevel,
            applicant.student_current_academicbackground?.yearLevel,
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
          junior_graduate: applicant.academicHistory?.secondaryGraduate || null,
          senior_highschool:
            applicant.academicHistory?.seniorHighSchool || "Not Provided",
          senior_address:
            applicant.academicHistory?.seniorHighAddress || "Not Provided",
          senior_honors: applicant.academicHistory?.seniorHighHonors || "None",
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

    // Log the full response from onlineFullStudentInfoPOST for inspection
    console.log(
      "Post response (onlineFullStudentInfoPOST):",
      onlineFullStudentInfoPOST.data
    );

    // Extract the IDs of these enrollments
    const enrollmentIds = classEnrollments.map(
      (enrollment) => enrollment.student_class_enrollment_id
    );

    // Update statuses of these class enrollments
    await db.StudentClassEnrollments.update(
      {status: "enrolled"},
      {
        where: {student_class_enrollment_id: enrollmentIds},
        transaction,
      }
    );

    // Proceed with mapping to student_subject
    const studentSubjectsData = [];

    for (const enrolledClass of classEnrollments) {
      const course_id = enrolledClass.class.course_id;

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

    // Insert into student_subject
    await db.StudentSubjects.bulkCreate(studentSubjectsData, {transaction});

    // Commit the transaction
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    console.error(
      "Error in enrollStudentMockUpOnsite:",
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
    const newIdNumber = (parseInt(lastId) + 1).toString().padStart(5, "0"); // ! Change to 5 later
    return `${currentYear}-${newIdNumber}`;
  } else {
    return `${currentYear}-00001`; // ! Change to 5 later
  }
}

/**
 * Fetch applicant data from the MH Afric API and update or create new records in the
 * Applicant table. If an applicant record already exists, it will be updated if the
 * data from the API is different from the existing data. If the data is the same, the
 * record will not be updated.
 *
 * @param {string} [campusName] - The campus name to filter the applicant data by.
 * @param {boolean} [isAborted] - Whether the processing has been aborted. If true, the
 * transaction will be rolled back.
 *
 * @returns {Promise<{isUpToDate: boolean}>} - A promise that resolves to an object with
 * a single property, `isUpToDate`, which is a boolean indicating whether the applicant
 * data was up to date or not.
 */
async function fetchApplicantData(campusName = null, isAborted = false) {
  let apiUrl;
  const {sequelize} = require("_helpers/db");
  const pLimit = await import("p-limit");

  const limit = pLimit.default(5); // Allow up to 5 concurrent operations

  if (campusName) {
    const campus = await db.Campus.findOne({where: {campusName}});
    if (!campus) throw new Error("Campus not found");
    apiUrl = `${url}/api/stdntbasicinfo?filter=campus=${campus.campus_id}`;
  } else {
    apiUrl = `${url}/api/stdntbasicinfo/`;
  }

  const transaction = await sequelize.transaction();
  let isUpToDate = true;

  try {
    const response = await axios.get(apiUrl);
    if (response.data && Array.isArray(response.data)) {
      const applicantsData = response.data;

      // Fetch campuses and programs with the correct structure
      const campuses = await db.Campus.findAll(); // Fetch all campuses as usual
      const programs = await db.Program.findAll({
        include: [
          {
            model: db.Department,
            include: [
              {
                model: db.Campus, // Ensure that the program belongs to the right campus
                attributes: ["campus_id", "campusName"],
              },
            ],
          },
        ],
      });

      // Create a campus map to easily find campus records by name
      const campusMap = Object.fromEntries(
        campuses.map((c) => [c.campus_id, c])
      );

      // Create a program map based on the correct department-campus relationship
      const programMap = Object.fromEntries(
        programs.map((p) => {
          const campus = p.department.campus;
          if (campus) {
            return [`${campus.campus_id}_${p.program_id}`, p];
          }
          return [p.program_id, p]; // Fallback if no campus is found
        })
      );

      let skippedApplicants = []; // Track skipped applicants

      await Promise.all(
        applicantsData.map((applicantData) =>
          limit(async () => {
            if (isAborted) {
              console.log("Processing aborted, rolling back transaction...");
              await transaction.rollback();
              return;
            }

            try {
              const campusRecord = campusMap[applicantData.campus];
              if (!campusRecord) {
                skippedApplicants.push({
                  reason: "No campus match",
                  data: applicantData,
                });
                return;
              }

              const programRecordKey = `${campusRecord.campus_id}_${applicantData.program}`;
              const programRecord = programMap[programRecordKey];

              if (!programRecord) {
                skippedApplicants.push({
                  reason: "No program match or program-campus mismatch",
                  data: applicantData,
                });
                return;
              }

              const newApplicant = {
                applicant_id_external: applicantData.applicant_id,
                enrollmentType: "online",
                firstName: applicantData.first_name
                  ? applicantData.first_name.trim()
                  : null,
                middleName: applicantData.middle_name
                  ? applicantData.middle_name.trim()
                  : null,
                lastName: applicantData.last_name
                  ? applicantData.last_name.trim()
                  : null,
                suffix: applicantData.suffix
                  ? applicantData.suffix.trim()
                  : null,
                gender: applicantData.sex || null,
                email: applicantData.email
                  ? applicantData.email.trim().toLowerCase()
                  : null,
                contactNumber: applicantData.contact_number
                  ? applicantData.contact_number.trim()
                  : null,
                address: applicantData.address
                  ? applicantData.address.trim()
                  : null,
                yearLevel: applicantData.year_level || null,
                isTransferee: applicantData.is_transferee ? true : false,
                campus_id: programRecord.department.campus.campus_id,
                program_id: programRecord.program_id,
                birthDate: applicantData.birth_date || null,
                // status: applicantData.status || null,
                isActive: applicantData.is_active || null,
                dateEnrolled: applicantData.created_at || null,
              };

              const existingApplicant = await db.StudentPersonalData.findOne({
                where: {
                  firstName: newApplicant.firstName,
                  lastName: newApplicant.lastName,
                  birthDate: newApplicant.birthDate,
                  campus_id: programRecord.department.campus.campus_id,
                  program_id: programRecord.program_id,
                  email: newApplicant.email,
                },
              });

              if (existingApplicant) {
                // Compare only relevant fields
                const relevantFields = [
                  "firstName",
                  "middleName",
                  "lastName",
                  "suffix",
                  "gender",
                  "email",
                  "contactNumber",
                  "address",
                  "yearLevel",
                  "isTransferee",
                  "campus_id",
                  "program_id",
                  "birthDate",
                  "status",
                  "dateEnrolled",
                ];

                const existingApplicantData = {};
                const newApplicantData = {};

                relevantFields.forEach((field) => {
                  if (field === "dateEnrolled") {
                    // Normalize dateEnrolled by stripping milliseconds (if any)
                    const normalizeDate = (date) => {
                      return date
                        ? new Date(date).toISOString().split(".")[0] + "Z"
                        : null;
                    };

                    existingApplicantData[field] = normalizeDate(
                      existingApplicant[field]
                    );
                    newApplicantData[field] = normalizeDate(
                      newApplicant[field]
                    );
                  } else if (field === "isTransferee") {
                    existingApplicantData[field] = Boolean(
                      existingApplicant[field]
                    );
                    newApplicantData[field] = Boolean(newApplicant[field]);
                  } else if (["campus_id", "program_id"].includes(field)) {
                    existingApplicantData[field] = Number(
                      existingApplicant[field]
                    );
                    newApplicantData[field] = Number(newApplicant[field]);
                  } else {
                    existingApplicantData[field] = existingApplicant[field]
                      ? existingApplicant[field].toString().trim()
                      : null;
                    newApplicantData[field] = newApplicant[field]
                      ? newApplicant[field].toString().trim()
                      : null;
                  }
                });

                const isDifferent = !deepEqual(
                  existingApplicantData,
                  newApplicantData
                );

                if (isDifferent) {
                  await db.StudentPersonalData.update(newApplicant, {
                    where: {applicant_id: existingApplicant.applicant_id},
                    transaction,
                  });
                  isUpToDate = false;
                } else {
                  // No change in applicant data
                  isUpToDate = true;
                }
              } else {
                // Create new applicant record
                await db.StudentPersonalData.create(newApplicant, {
                  transaction,
                });
                isUpToDate = false; // New data was inserted
              }
            } catch (err) {
              console.error(`Error processing applicant: ${err.message}`);
            }
          })
        )
      );

      if (skippedApplicants.length > 0) {
        console.log("Skipped applicants: ", skippedApplicants);
      }
    }

    await transaction.commit();
    return {isUpToDate};
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    throw error;
  }
}

async function getApplicants(whereClause, campus_id = null) {
  const applicants = await db.StudentPersonalData.findAll({
    where: {
      ...whereClause,
      ...(campus_id ? {campus_id} : undefined),
    },
    include: [
      {
        model: db.Program,
        attributes: ["programCode", "programDescription"],
        include: [
          {
            model: db.Department,
            attributes: ["departmentCode", "departmentName"],
            required: false, // Fetch department even if campus is not found
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
    order: [["applicant_id", "ASC"]], // Apply sorting here (by applicant_id)
  });

  return applicants.map((applicant) => ({
    ...applicant.toJSON(),
    programCode: applicant.program.programCode || "programCode not found",
    departmentName: applicant.program.department
      ? applicant.program.department.departmentName
      : "Department not found",
    campusName:
      applicant.program.department && applicant.program.department.campus
        ? applicant.program.department.campus.campusName
        : "Campus not found",
  }));
}

async function getAllApplicant(campus_id = null) {
  const whereClause = {isActive: true, isDeleted: false};

  return await getApplicants(whereClause, campus_id);
}

async function getAllApplicantCount(campus_id = null) {
  const whereClause = {isActive: true, isDeleted: false};

  return await db.StudentPersonalData.count({
    where: {
      ...whereClause,
      ...(campus_id ? {campus_id} : {}),
    },
  });
}

// ! For Student

// Helper function to get all students officially enrolled, optionally filtered by campusName
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
        [Op.like]: `${new Date().getFullYear()}%`, // Assuming student_id starts with the year
      },
    },
    include: [
      {
        model: db.StudentPersonalData,
        // No alias used here
        include: [
          {
            model: db.StudentAcademicBackground,
            // No alias used here
            include: [
              {
                model: db.Program,
                // No alias used here
                include: [
                  {
                    model: db.Department,
                    // No alias used here
                    attributes: ["department_id", "departmentName"],
                  },
                ],
                attributes: ["program_id", "department_id"],
              },
            ],
            attributes: [
              "majorIn",
              "studentType",
              "applicationType",
              "yearEntry",
              "yearGraduate",
            ],
          },
        ],
        attributes: ["student_personal_id"],
      },
      {
        model: db.Campus,
        // No alias used here
        attributes: ["campusName"],
      },
    ],
    attributes: ["student_id"], // Include other attributes as needed
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

    // Access the associated StudentAcademicBackground
    const academicBackground =
      studentPersonalData.student_current_academicbackground; // Assuming model name is 'student_current_academicbackground'

    if (!academicBackground) {
      console.warn(
        `Warning: AcademicBackground not found for studentPersonalData ID ${studentPersonalData.student_personal_id}. Skipping student ID ${student.student_id}.`
      );
      return; // Skip this student
    }

    // Access the associated Program
    const program = academicBackground.program; // Assuming 'program' association without alias

    if (!program) {
      console.warn(
        `Warning: Program not found for academicBackground ID associated with studentPersonalData ID ${studentPersonalData.student_personal_id}. Skipping student ID ${student.student_id}.`
      );
      return; // Skip this student
    }

    // Access the associated Department
    const department = program.department; // Assuming 'department' association without alias

    if (!department) {
      console.warn(
        `Warning: Department not found for program ID ${program.program_id}. Skipping student ID ${student.student_id}.`
      );
      return; // Skip this student
    }

    console.log(
      `Mapping Student ID ${student.student_id} to Department ${department.departmentName}`
    );

    studentsWithDepartment.push({
      ...student.toJSON(),
      department_id: department.department_id,
      departmentName: department.departmentName,
      campusName: student.Campus ? student.Campus.campusName : null, // Access without alias
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
    throw new Error("Student not found.");
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

  // Fetch the current enrollment process for the applicant
  let enrollmentProcess = await db.EnrollmentProcess.findOne({
    where: {student_personal_id: student_personal_id},
  });

  if (!enrollmentProcess) {
    // If no existing process found, create a new record with default "in-progress" statuses
    enrollmentProcess = await db.EnrollmentProcess.create({
      student_personal_id: student_personal_id,
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
    // Enroll the student by calling enrollStudentMockUpOnsite
    await enrollStudentMockUpOnsite(student_personal_id);

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

/**
 * Retrieves all enrollment statuses with optional filters.
 *
 * @param {number|null} campus_id - Optional campus ID to filter by.
 * @param {string|null} registrar_status - Optional registrar status value to filter by.
 * @param {string|null} accounting_status - Optional accounting status value to filter by.
 * @param {boolean|string|null} final_approval_status - Optional final approval status value to filter by.
 * @returns {Promise<Array>} - Array of enrollment status objects.
 */
async function getAllEnrollmentStatus(
  campus_id = null,
  registrar_status = null,
  accounting_status = null,
  final_approval_status = null,
  payment_confirmed = null
) {
  try {
    // Build the where clause for EnrollmentProcess based on status filters
    const enrollmentWhere = {};

    if (registrar_status) {
      enrollmentWhere.registrar_status = {
        [Op.eq]: registrar_status,
      };
    }

    if (accounting_status) {
      enrollmentWhere.accounting_status = {
        [Op.eq]: accounting_status,
      };
    }

    if (final_approval_status !== null && final_approval_status !== undefined) {
      // Existing logic for final_approval_status
    }

    if (payment_confirmed !== null && payment_confirmed !== undefined) {
      // Convert string to boolean if necessary
      let paymentConfirmedBool;
      if (typeof payment_confirmed === "boolean") {
        paymentConfirmedBool = payment_confirmed;
      } else if (typeof payment_confirmed === "string") {
        if (payment_confirmed.toLowerCase() === "true") {
          paymentConfirmedBool = true;
        } else if (payment_confirmed.toLowerCase() === "false") {
          paymentConfirmedBool = false;
        }
      }

      if (typeof paymentConfirmedBool === "boolean") {
        enrollmentWhere.payment_confirmed = {
          [Op.eq]: paymentConfirmedBool,
        };
      }
    }

    // Build the where clause for StudentPersonalData based on campus_id
    const studentWhere = {};

    if (campus_id) {
      studentWhere.campus_id = {
        [Op.eq]: campus_id,
      };
    }

    const enrollmentStatuses = await db.EnrollmentProcess.findAll({
      where: enrollmentWhere,
      include: [
        {
          model: db.StudentPersonalData,
          attributes: [
            "firstName",
            "lastName",
            "middleName",
            "email",
            "campus_id",
          ],
          where: studentWhere,
          include: [
            {
              model: db.StudentAcademicBackground,
              attributes: [
                "id",
                "program_id",
                "studentType",
                "applicationType",
                "semester_id",
                "yearLevel",
              ],
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
      order: [["enrollment_id", "ASC"]],
    });

    return enrollmentStatuses.map((status) => ({
      ...status.toJSON(),
      fullName: `${status.student_personal_datum.firstName} ${
        status.student_personal_datum.middleName
          ? status.student_personal_datum.middleName[0] + ". "
          : ""
      }${status.student_personal_datum.lastName}`,
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
