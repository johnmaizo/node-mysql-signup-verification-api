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
  getAllEnrollmentStatus,
  getEnrollmentStatusById,

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
    apiUrl = `${url}/api/stdntbasicinfoapplication/?filter=campus=${campus.campusName}`;
  } else {
    apiUrl = `${url}/api/stdntbasicinfoapplication/`;
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
        campuses.map((c) => [c.campusName, c])
      );

      // Create a program map based on the correct department-campus relationship
      const programMap = Object.fromEntries(
        programs.map((p) => {
          const campus = p.department.campus;
          if (campus) {
            return [`${campus.campusName}_${p.programCode}`, p];
          }
          return [p.programCode, p]; // Fallback if no campus is found
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

              const programRecordKey = `${campusRecord.campusName}_${applicantData.program}`;
              const programRecord = programMap[programRecordKey];

              if (!programRecord) {
                skippedApplicants.push({
                  reason: "No program match or program-campus mismatch",
                  data: applicantData,
                });
                return;
              }

              const newApplicant = {
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
                enrollmentType: "online",
                birthDate: applicantData.birth_date || null,
                status: applicantData.status || null,
                isActive: applicantData.active || null,
                dateEnrolled: applicantData.created_at || null,
              };

              const existingApplicant = await db.Applicant.findOne({
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
                  await db.Applicant.update(newApplicant, {
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
                await db.Applicant.create(newApplicant, {transaction});
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

// Updated updateEnrollmentProcess function
async function updateEnrollmentProcess(params) {
  const {applicant_id, status, payment_confirmed, allRoles, specificRole} =
    params;

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

  // Check if the applicant exists in the database
  const applicant = await db.Applicant.findByPk(applicant_id);

  if (!applicant) {
    throw new Error(`Applicant with ID ${applicant_id} does not exist.`);
  }

  // Fetch the current enrollment process for the applicant
  let enrollmentProcess = await db.EnrollmentProcess.findOne({
    where: {applicant_id: applicant_id},
  });

  if (!enrollmentProcess) {
    // If no existing process found, create a new record with default "upcoming" statuses
    enrollmentProcess = await db.EnrollmentProcess.create({
      applicant_id: applicant_id,
      registrar_status: "in-progress",
      dean_status: "upcoming",
      accounting_status: "upcoming",
      payment_confirmed: false, // Set payment to false initially
    });
  }

  // Get the current date to track when statuses are updated
  const currentDate = new Date();

  // Step 1: Handle the specific role update based on the provided specificRole
  switch (specificRole) {
    case Role.Registrar:
      enrollmentProcess.registrar_status = status;
      enrollmentProcess.registrar_status_date = currentDate;

      // If Registrar rejects, stop the process
      if (status === "rejected") {
        await enrollmentProcess.save();
        return {
          message:
            "Registrar has rejected the application. Enrollment process cannot continue.",
          readyForEnrollment: false,
        };
      }

      // If Registrar accepts, Dean status moves to "in-progress"
      if (status === "accepted") {
        enrollmentProcess.dean_status = "in-progress";
      }
      break;

    case Role.Dean:
      // Ensure the Registrar has accepted before the Dean can proceed
      if (enrollmentProcess.registrar_status !== "accepted") {
        throw new Error(
          "Registrar must accept the application before the Dean can proceed."
        );
      }

      enrollmentProcess.dean_status = status;
      enrollmentProcess.dean_status_date = currentDate;

      // If Dean rejects, stop the process
      if (status === "rejected") {
        await enrollmentProcess.save();
        return {
          message:
            "Dean has rejected the application. Enrollment process cannot continue.",
          readyForEnrollment: false,
        };
      }

      // If Dean accepts, Accounting status moves to "in-progress"
      if (status === "accepted") {
        enrollmentProcess.accounting_status = "in-progress";
      }
      break;

    case Role.Accounting:
      // Ensure both Registrar and Dean have accepted before Accounting can proceed
      if (
        enrollmentProcess.registrar_status !== "accepted" ||
        enrollmentProcess.dean_status !== "accepted"
      ) {
        throw new Error(
          "Both Registrar and Dean must accept the application before Accounting can proceed."
        );
      }

      enrollmentProcess.accounting_status = status;
      enrollmentProcess.accounting_status_date = currentDate;
      enrollmentProcess.payment_confirmed = payment_confirmed || false;

      // If Accounting rejects, stop the process
      if (status === "rejected") {
        await enrollmentProcess.save();
        return {
          message:
            "Accounting has rejected the application. Enrollment process cannot continue.",
          readyForEnrollment: false,
        };
      }
      break;

    default:
      throw new Error(
        `Invalid role: ${specificRole} for updating the enrollment process.`
      );
  }

  // Step 2: Save the updated enrollment process
  await enrollmentProcess.save();

  // Step 3: Check if all approvals are accepted and ready for enrollment
  if (
    enrollmentProcess.registrar_status === "accepted" &&
    enrollmentProcess.dean_status === "accepted" &&
    enrollmentProcess.accounting_status === "accepted" &&
    enrollmentProcess.payment_confirmed
  ) {
    return {
      message: "All approvals accepted. Student is ready for enrollment.",
      readyForEnrollment: true,
    };
  }

  return {
    message: "Enrollment process updated.",
    readyForEnrollment: false,
  };
}

// Get all enrollment statuses
async function getAllEnrollmentStatus(campus_id = null) {
  const enrollmentStatuses = await db.EnrollmentProcess.findAll({
    include: [
      {
        model: db.Applicant,
        attributes: ["firstName", "lastName", "email", "campus_id"],
        where: {
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
    order: [["enrollment_id", "ASC"]], // Order by enrollment ID or as needed
  });

  return enrollmentStatuses.map((status) => ({
    ...status.toJSON(),
    applicant: {
      firstName: status.applicant.firstName,
      lastName: status.applicant.lastName,
      email: status.applicant.email,
      programCode:
        status.applicant.program.programCode || "programCode not found",
      departmentName: status.applicant.program.department
        ? status.applicant.program.department.departmentName
        : "Department not found",
      campusName:
        status.applicant.program.department &&
        status.applicant.program.department.campus
          ? status.applicant.program.department.campus.campusName
          : "Campus not found",
    },
  }));
}

// Get enrollment status by applicant ID
async function getEnrollmentStatusById(enrollment_id) {
  const enrollmentStatus = await db.EnrollmentProcess.findOne({
    where: {enrollment_id},
    include: [
      {
        model: db.Applicant,
        attributes: ["firstName", "lastName", "email"],
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
  });

  if (!enrollmentStatus) {
    throw new Error(`Enrollment status not found for ID ${enrollment_id}`);
  }

  return {
    ...enrollmentStatus.toJSON(),
    applicant: {
      firstName: enrollmentStatus.applicant.firstName,
      lastName: enrollmentStatus.applicant.lastName,
      email: enrollmentStatus.applicant.email,
      programCode:
        enrollmentStatus.applicant.program.programCode ||
        "programCode not found",
      departmentName: enrollmentStatus.applicant.program.department
        ? enrollmentStatus.applicant.program.department.departmentName
        : "Department not found",
      campusName:
        enrollmentStatus.applicant.program.department &&
        enrollmentStatus.applicant.program.department.campus
          ? enrollmentStatus.applicant.program.department.campus.campusName
          : "Campus not found",
    },
  };
}
