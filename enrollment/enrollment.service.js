const {Op, where} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

const axios = require("axios");

const deepEqual = require("deep-equal");

require("dotenv").config();

module.exports = {
  enrollStudent,
  getAllStudentsOfficial,
  getAllStudentsOfficalActive,
  getAllStudentOfficialCount,
  getChartData,

  getStudentById,
  updateStudent,
  // deleteStudent,

  updateEnrollmentProcess,
  getEnrollmentProcessByApplicantId,

  fetchApplicantData,
  getAllApplicant,
  getAllApplicantCount,
};

const url = process.env.MHAFRIC_API;

/**
 * Enrolls a student based on the applicant ID provided, and updates the status of the applicant in the MH Afric API to "accepted".
 * @param {Object} params - An object containing the applicant ID.
 * @param {number} accountId - The ID of the account performing the action.
 * @returns {Promise<void>}
 * @throws {Error} If the applicant ID is not provided, if the student is already enrolled, or if there is an error with the API requests.
 */
async function enrollStudent(params, accountId) {
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
  const studentOfficial = new db.StudentOfficalBasic(studentparams);
  await studentOfficial.save();

  // Log the creation action
  await db.History.create({
    action: "create",
    entity: "Student",
    entityId: studentOfficial.id,
    changes: studentparams,
    accountId: accountId,
  });
}

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
  const lastStudentOnDepartment = await db.StudentOfficalBasic.findOne({
    where: {
      student_id: {
        [Op.like]: `${currentYear}-${departmentCode}-%`, // Specific to the campus and department
      },
      campus_id: campus.campus_id, // Ensures it matches the campus
    },
    order: [["createdAt", "DESC"]],
  });

  const lastStudent = await db.StudentOfficalBasic.findOne({
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
  const lastStudent = await db.StudentOfficalBasic.findOne({
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
    const newIdNumber = (parseInt(lastId) + 1).toString().padStart(4, "0"); // ! Change to 5 later
    return `${currentYear}-${newIdNumber}`;
  } else {
    return `${currentYear}-0001`; // ! Change to 5 later
  }
}

async function fetchApplicantData(campusName = null, isAborted = false) {
  let apiUrl;
  const {sequelize} = require("_helpers/db");

  // Fetch the campus based on the campus name
  if (campusName) {
    const campus = await db.Campus.findOne({where: {campusName}});

    if (!campus) {
      throw new Error("Campus not found");
    }

    apiUrl = `https://afknon.pythonanywhere.com/api/stdntbasicinfoapplication/?filter=campus=${campus.campusName}`;
  } else {
    apiUrl = "https://afknon.pythonanywhere.com/api/stdntbasicinfoapplication/";
  }

  const transaction = await sequelize.transaction();
  let isUpToDate = true; // Flag to check if data is up to date

  try {
    const response = await axios.get(apiUrl);

    if (response.data && Array.isArray(response.data)) {
      const applicantsData = response.data;

      for (let applicantData of applicantsData) {
        if (isAborted) {
          console.log("Processing aborted, rolling back transaction...");
          await transaction.rollback();
          return;
        }

        const {
          first_name,
          middle_name,
          last_name,
          suffix,
          is_transferee,
          year_level,
          contact_number,
          address,
          campus,
          program,
          birth_date,
          sex,
          email,
          status,
          active,
          created_at,
        } = applicantData;

        try {
          const campusRecord = await db.Campus.findOne({
            where: {campusName: campus},
          });

          if (!campusRecord) continue; // Skip if campus is not found

          const programRecord = await db.Program.findOne({
            where: {programCode: program},
            include: [
              {
                model: db.Department,
                where: {campus_id: campusRecord.campus_id}, // Ensure the department belongs to the specified campus
                include: [
                  {
                    model: db.Campus,
                    attributes: ["campus_id", "campusName"],
                  },
                ],
              },
            ],
          });

          if (!programRecord) continue; // Skip if program is not found

          // Create the new applicant object without applicant_id
          const newApplicant = {
            firstName: first_name ? first_name.trim() : null,
            middleName: middle_name ? middle_name.trim() : null,
            lastName: last_name ? last_name.trim() : null,
            suffix: suffix ? suffix.trim() : null,
            gender: sex || null,
            email: email ? email.trim().toLowerCase() : null,
            contactNumber: contact_number ? contact_number.trim() : null,
            address: address ? address.trim() : null,
            yearLevel: year_level || null,
            isTransferee: is_transferee ? true : false,
            campus_id: programRecord.department.campus.campus_id,
            program_id: programRecord.program_id,
            enrollmentType: "online",
            birthDate: birth_date || null,
            status: status || null,
            isActive: active || null,
            dateEnrolled: created_at || null,
          };

          // Check if the applicant already exists based on unique constraints
          const existingApplicant = await db.Applicant.findOne({
            where: {
              firstName: first_name,
              lastName: last_name,
              birthDate: birth_date,
              campus_id: programRecord.department.campus.campus_id,
              program_id: programRecord.program_id,
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
                newApplicantData[field] = normalizeDate(newApplicant[field]);
              } else if (field === "isTransferee") {
                existingApplicantData[field] = Boolean(
                  existingApplicant[field]
                );
                newApplicantData[field] = Boolean(newApplicant[field]);
              } else if (["campus_id", "program_id"].includes(field)) {
                existingApplicantData[field] = Number(existingApplicant[field]);
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

            // console.log(
            //   `Normalized existing applicant:`,
            //   existingApplicantData
            // );
            // console.log(
            //   `With new normalized applicant data:`,
            //   newApplicantData
            // );

            const isDifferent = !deepEqual(
              existingApplicantData,
              newApplicantData
            );

            if (isDifferent) {
              await db.Applicant.update(newApplicant, {
                where: {applicant_id: existingApplicant.applicant_id},
                transaction,
              });
              console.log(`Updated applicant: ${first_name} ${last_name}`);
              isUpToDate = false;
            } else {
              console.log(
                `Applicant ${first_name} ${last_name} is up to date.`
              );
            }
          } else {
            // Create new applicant record
            await db.Applicant.create(newApplicant, {transaction});
            console.log(`Inserted new applicant: ${first_name} ${last_name}`);
            isUpToDate = false; // New data was inserted
          }
        } catch (err) {
          console.error(`Error processing applicant: ${err.message}`);
          // Continue processing other applicants but don't interfere with the transaction
          continue;
        }
      }
    }

    await transaction.commit();
    return {isUpToDate};
  } catch (error) {
    // If there was an error in the outer try block, roll back the transaction
    if (!transaction.finished) {
      await transaction.rollback();
    }
    throw error;
  }
}

// Common function to get applicants based on filter conditions
async function getApplicants(whereClause, campus_id = null) {
  const applicants = await db.Applicant.findAll({
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

  return await db.Applicant.count({
    where: {
      ...whereClause,
      ...(campus_id ? {campus_id} : {}),
    },
  });
}

// ! For Student

async function getAllStudentsOfficial(campusName = null) {
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

  // Retrieve students based on the provided campus or all students if campusName is null
  const students = await db.StudentOfficalBasic.findAll({
    where: {
      // Only filter by campus_id if a campus is found (i.e., campusName was provided)
      ...(campus ? {campus_id: campus.campus_id} : {}),
      student_id: {
        [Op.like]: `${new Date().getFullYear()}%`, // Adjust this condition as per your filtering needs
      },
    },
    include: [
      {
        model: db.Campus,
        attributes: ["campusName"], // Include only the campus name
      },
    ],
  });

  // If no students are found, return an empty array
  if (!students || students.length === 0) {
    return [];
  }

  // Retrieve departments based on the campus or all departments if no campus is specified
  const departmentsOnCampus = await db.Department.findAll({
    include: [
      {
        model: db.Campus,
        where: campusName ? {campusName} : undefined, // Filter departments by campus if provided
      },
    ],
  });

  if (!departmentsOnCampus || departmentsOnCampus.length === 0) {
    throw new Error(
      campusName
        ? `No departments found for campus "${campusName}"`
        : "No departments found"
    );
  }

  // Map the department index in the student_id back to the real department_id
  const studentsWithDepartment = students.map((student) => {
    // Split the student ID to extract the department index
    const studentIdParts = student.student_id.split("-");
    const departmentIndex = parseInt(studentIdParts[1], 10) - 1; // Convert index to 0-based

    // Ensure the department index is valid
    if (departmentIndex < 0 || departmentIndex >= departmentsOnCampus.length) {
      throw new Error(
        `Invalid department index ${departmentIndex + 1} in student ID ${
          student.student_id
        }`
      );
    }

    // Find the real department based on the index
    const department = departmentsOnCampus[departmentIndex];

    // Return the student object with the real department_id
    return {
      ...student.toJSON(), // Convert Sequelize object to plain object
      department_id: department.department_id,
      departmentName: department.departmentName,
      campusName: student ? student.campus.campusName : null,
    };
  });

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
  const studentCount = await db.StudentOfficalBasic.count({
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

  // If campusName is provided, fetch the campus based on the campus name
  if (campusName) {
    campus = await db.Campus.findOne({
      where: {campusName},
    });

    // Check if the campus exists
    if (!campus) {
      throw new Error(`Campus "${campusName}" not found`);
    }
  }

  // Fetch all departments that belong to the specified campus or all campuses
  const departments = await db.Department.findAll({
    include: [
      {
        model: db.Campus,
        where: campus ? {campusName} : undefined, // Filter departments by campus if provided
        attributes: ["campusName"],
      },
    ],
  });

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

  // Fetch all students filtered by campus or all students if no campusName is provided
  const students = await getAllStudentsOfficial(campusName);

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

  let totalStudents = students.length;

  departments.forEach((department, index) => {
    // Filter students by department
    const studentsInDept = students.filter(
      (student) => student.departmentName === department.departmentName
    );

    const studentCount = studentsInDept.length;
    const percentage = ((studentCount / totalStudents) * 100).toFixed(2); // Calculate percentage

    // Add data to chart arrays
    chartData.labels.push({
      departmentCode: department.departmentCode, // Assuming departmentCode exists
      departmentName: department.departmentName,
      departmentCodeWithCampusName: `${department.departmentCode} (${department.campus.campusName})`,
      departmentNameWithCampusName: `${department.departmentName} (${department.campus.campusName})`,
    });
    chartData.series.push(studentCount);
    chartData.percentages.push(percentage);

    const newColor = generateColor(baseColors[index % baseColors.length]);
    chartData.colors.push(newColor);

    // ! Generate new color if the index exceeds the baseColors length
    // if (index < baseColors.length) {
    //   chartData.colors.push(baseColors[index]);
    // } else {
    //   const newColor = generateColor(baseColors[index % baseColors.length]);
    //   chartData.colors.push(newColor);
    // }
  });

  return chartData;
}

// Generate new color if the index exceeds the baseColors length
// if (index < baseColors.length) {
//   chartData.colors.push(baseColors[index]);
// } else {
//   const newColor = generateColor(baseColors[index % baseColors.length]);
//   chartData.colors.push(newColor);
// }

async function getAllStudentsOfficalActive() {
  const students = await db.StudentOfficalBasic.count({
    where: {
      isActive: true,
    },
  });
  return students;
}

async function getStudentById(id) {
  const student = await db.StudentOfficalBasic.findByPk(id);
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

// Function to update the enrollment process
async function updateEnrollmentProcess(params) {
  const {applicant_id, status, payment_confirmed, allRoles, specificRole} =
    params;

  // Define the roles that can update the enrollment process
  const validRoles = [Role.Accounting, Role.Dean, Role.Registrar];

  // Ensure the required parameters are present
  if (!applicant_id || !status || !specificRole || !allRoles) {
    throw new Error(
      "Applicant ID, status, specific role, and all roles are required."
    );
  }

  // Convert the comma-separated roles string into an array
  const userRoles = allRoles.split(",").map((r) => r.trim());

  // Check if the specific role is valid and present in the user's roles
  if (!userRoles.includes(specificRole)) {
    throw new Error(`User does not have the role: ${specificRole}`);
  }

  // Fetch the current enrollment process for the applicant
  let enrollmentProcess = await db.EnrollmentProcess.findOne({
    where: {applicant_id: applicant_id},
  });

  if (!enrollmentProcess) {
    // If no existing process found, create a new record with default "pending" statuses
    enrollmentProcess = await db.EnrollmentProcess.create({
      applicant_id: applicant_id,
      registrar_status: "pending",
      dean_status: "pending",
      accounting_status: "pending",
      payment_confirmed: false, // Set payment to false initially
    });
  }

  // Step 1: Handle the specific role update based on the provided specificRole
  switch (specificRole) {
    case Role.Registrar:
      // Registrar can update their own status directly
      enrollmentProcess.registrar_status = status;
      break;

    case Role.Dean:
      // Ensure the Registrar has accepted before the Dean can approve
      if (enrollmentProcess.registrar_status !== "accepted") {
        throw new Error(
          "Registrar must accept the application before the Dean can approve."
        );
      }
      enrollmentProcess.dean_status = status;
      break;

    case Role.Accounting:
      // Ensure both Registrar and Dean have accepted before Accounting can approve
      if (
        enrollmentProcess.registrar_status !== "accepted" ||
        enrollmentProcess.dean_status !== "accepted"
      ) {
        throw new Error(
          "Both Registrar and Dean must accept the application before Accounting can approve."
        );
      }
      enrollmentProcess.accounting_status = status;
      enrollmentProcess.payment_confirmed = payment_confirmed || false; // Confirm payment if available
      break;

    default:
      throw new Error(
        `Invalid role: ${specificRole} for updating the enrollment process.`
      );
  }

  // Step 2: Save the updated enrollment process
  await enrollmentProcess.save();

  // Step 3: Check if all approvals are complete and ready for enrollment
  if (
    enrollmentProcess.registrar_status === "accepted" &&
    enrollmentProcess.dean_status === "accepted" &&
    enrollmentProcess.accounting_status === "accepted" &&
    enrollmentProcess.payment_confirmed
  ) {
    return {
      message: "All approvals completed. Student is ready for enrollment.",
      readyForEnrollment: true,
    };
  }

  return {
    message: "Enrollment process updated.",
    readyForEnrollment: false,
  };
}

// Function to get the enrollment process by applicant ID
async function getEnrollmentProcessByApplicantId(applicant_id) {
  if (!applicant_id) {
    throw new Error("Applicant ID is required.");
  }

  const enrollmentProcess = await db.EnrollmentProcess.findOne({
    where: {applicant_id: applicant_id},
  });

  if (!enrollmentProcess) {
    throw new Error("Enrollment process not found for this applicant.");
  }

  return enrollmentProcess;
}
