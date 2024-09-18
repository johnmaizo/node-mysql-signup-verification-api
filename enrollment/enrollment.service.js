const {Op, where} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

// const axios = require("axios");
const axios = require("axios").default;

require("dotenv").config();

module.exports = {
  enrollStudent,
  getAllStudentsOfficial,
  getAllStudentsOfficalActive,
  getAllStudentOfficialCount,
  getStudentStatisticsForChart,
  getChartData,

  getStudentById,
  updateStudent,
  // deleteStudent,
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
    studentparams.program,
    campus_name
  );

  // New POST request after generating the student ID
  const postResponse = await axios.post(
    `${url}/api/stdntbasicinfo/`,
    {
      student_id: studentparams.student_id,
      applicant_id: params.applicant_id,
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

async function generateStudentId(programCode, campusName) {
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

async function getStudentStatisticsForChart(campusName = null) {
  let campus;

  // Fetch campus if campusName is provided
  if (campusName) {
    campus = await db.Campus.findOne({
      where: {campusName},
    });

    if (!campus) {
      throw new Error("Campus not found");
    }
  }

  // Fetch all departments
  const departments = await db.Department.findAll({
    where: {
      ...(campus ? {campus_id: campus.campus_id} : {}),
    },
  });

  if (!departments || departments.length === 0) {
    throw new Error("No departments found");
  }

  // Initialize statistics arrays
  const labels = [];
  const series = [];
  const colors = [];
  const colorPalette = ["#3C50E0", "#6577F3", "#8FD0EF", "#0FADCF"];
  const totalStudentsCount = await db.StudentOfficalBasic.count({
    where: {
      ...(campus ? {campus_id: campus.campus_id} : {}),
    },
  });

  if (totalStudentsCount === 0) {
    throw new Error("No students found");
  }

  // Iterate through each department
  for (let i = 0; i < departments.length; i++) {
    const department = departments[i];

    // Count the students in the current department
    const studentCount = await db.StudentOfficalBasic.count({
      where: {
        department_id: department.department_id,
        ...(campus ? {campus_id: campus.campus_id} : {}),
      },
    });

    // Push department name to labels
    labels.push(department.departmentName);

    // Push the student count to series
    series.push(studentCount);

    // Generate unique color based on the palette
    colors.push(colorPalette[i % colorPalette.length]); // Rotate over the colors if needed
  }

  // Calculate percentage for each department
  const percent = series.map((count) =>
    ((count / totalStudentsCount) * 100).toFixed(2)
  );

  // Return the data for ApexCharts
  return {
    labels, // Department names
    series, // Number of students in each department
    colors, // Unique colors for each department
    percent, // Percentage of total students in each department
  };
}

function generateColor(baseColor) {
  let color = baseColor.replace("#", "");

  let r = parseInt(color.substring(0, 2), 16);
  let g = parseInt(color.substring(2, 4), 16);
  let b = parseInt(color.substring(4, 6), 16);

  // Introduce randomness to each channel to generate a distinct color
  r = Math.min(255, Math.max(0, r + Math.floor(Math.random() * 100 - 50))); // Random variation within ±50
  g = Math.min(255, Math.max(0, g + Math.floor(Math.random() * 100 - 50)));
  b = Math.min(255, Math.max(0, b + Math.floor(Math.random() * 100 - 50)));

  // Ensure the new color is not too close to grayscale
  if (Math.abs(r - g) < 30 && Math.abs(g - b) < 30 && Math.abs(b - r) < 30) {
    // Shift one channel drastically if too close to grayscale
    r = (r + 100) % 255;
  }

  // Return the new color in hexadecimal format
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`.toUpperCase();
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
    throw new Error(
      campusName
        ? `No departments found for campus "${campusName}"`
        : "No departments found"
    );
  }

  // Fetch all students filtered by campus or all students if no campusName is provided
  const students = await getAllStudentsOfficial(campusName);

  if (!students || students.length === 0) {
    throw new Error(
      campusName
        ? `No students found for campus "${campusName}"`
        : "No students found"
    );
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
      campusName: department.campus.campusName,
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
