const {Op, where} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

module.exports = {
  getAllEmployee,

  getAllEmployeeActive,
  getAllCampusActive,
  getAllDepartmentsActive,
  getAllProgramsActive,
  getAllClassActive,
};

// ! Employee START
function transformEmployeeData(employee, roleFilter = null) {
  // Extract and filter roles if a roleFilter is provided
  let roles = employee.role
    ? employee.role.split(",").map((r) => r.trim())
    : [];

  if (roleFilter) {
    roles = roles.filter((role) => role === roleFilter);
  }

  const validRoles = [
    Role.SuperAdmin,
    Role.Admin,
    Role.Registrar,
    Role.DataCenter,
    Role.Dean,
    Role.Accounting,
  ];

  // Filter roles to keep only valid ones
  const forValidRoles = roles.filter((role) => validRoles.includes(role));

  // Get the first valid role if available
  const firstValidRole = roles.length > 0 ? roles[0] : null;

  // Handle qualifications, parse the string into an array if needed
  let qualificationsArray = [];
  if (typeof employee.qualifications === "string") {
    try {
      qualificationsArray = JSON.parse(employee.qualifications);
    } catch (error) {
      console.error("Error parsing qualifications:", error);
      qualificationsArray = []; // Handle the error by returning an empty array
    }
  } else if (Array.isArray(employee.qualifications)) {
    qualificationsArray = employee.qualifications;
  }

  // Check if qualifications exist and map the abbreviations
  const qualifications =
    qualificationsArray.length > 0
      ? `, (${qualificationsArray.map((q) => q.abbreviation).join(", ")})`
      : "";

  return {
    ...employee.toJSON(),
    role:
      roleFilter && roles.length > 0
        ? roles[0]
        : employee.role
        ? employee.role
        : null,
    allRoles: employee.role || null,
    fullName:
      `${employee.title} ${employee.firstName}${
        employee.middleName != null ? ` ${`${employee.middleName[0]}.`}` : ""
      } ${employee.lastName}${qualifications}` || null,
    fullNameWithRole:
      `${employee.title} ${employee.firstName}${
        employee.middleName != null ? ` ${`${employee.middleName[0]}.`}` : ""
      } ${employee.lastName}${qualifications} - ${
        firstValidRole ? firstValidRole : forValidRoles
      }` || null,
    name:
      `${employee.firstName}${
        employee.middleName != null ? ` ${`${employee.middleName[0]}.`}` : ""
      } ${employee.lastName}` || null,
    campusName: employee.campus?.campusName || "Campus name not found",
  };
}

async function getEmployees(
  whereClause,
  roleFilter = null,
  departmentCode = null
) {
  if (departmentCode) {
    const department = await db.Department.findOne({where: {departmentCode}});
    if (!department) {
      throw `Department with code "${departmentCode}" not found.`;
    }
  }

  const employees = await db.Employee.findAll({
    where: whereClause,
    include: [
      {
        model: db.Campus,
        attributes: ["campusName"], // Include only the campus name
      },
      {
        model: db.Department,
        where: departmentCode ? {departmentCode: departmentCode} : null,
        attributes: ["departmentName", "departmentCode"],
      },
    ],
  });

  return employees.map((employee) =>
    transformEmployeeData(employee, roleFilter)
  );
}

async function getAllEmployee(
  campus_id = null,
  role = null,
  forAccounts = null,
  departmentCode = null
) {
  const whereClause = {isDeleted: false};

  // Array of roles to filter when forAccounts is true
  const accountRoles = [
    "Admin",
    "DataCenter",
    "Registrar",
    "Accounting",
    "Dean",
  ];

  // Add campus_id condition if provided
  if (campus_id) {
    whereClause.campus_id = campus_id;
  }

  if (role) {
    whereClause.role = {
      [Op.like]: `%${role}%`,
    };

    if (role === "Admin") {
      whereClause.role = {
        [Op.like]: `%${role}%`, // Search for 'Admin'
        [Op.notLike]: `%SuperAdmin%`, // Exclude 'SuperAdmin'
      };
    }
  }

  if (forAccounts) {
    whereClause.role = {
      [Op.or]: accountRoles.map((accountRole) => ({
        [Op.like]: `%${accountRole}%`,
      })),
    };
  }

  return await getEmployees(whereClause, role, departmentCode);
}

async function getAllEmployeeActive(
  campus_id = null,
  role = null,
  forAccounts = null,
  departmentCode = null
) {
  const whereClause = {isActive: true, isDeleted: false};

  // Array of roles to filter when forAccounts is true
  const accountRoles = [
    "Admin",
    "MIS",
    "DataCenter",
    "Registrar",
    "Accounting",
    "Dean",
  ];

  if (campus_id) {
    whereClause.campus_id = campus_id;
  }

  if (role) {
    // Split the role string by commas if multiple roles are provided
    const rolesArray = role.includes(",")
      ? role.split(",").map((r) => r.trim())
      : [role];

    // Set the where clause for roles
    whereClause.role = {
      [Op.or]: rolesArray.map((r) => ({
        [Op.like]: `%${r}%`,
      })),
    };

    // Special case for 'Admin' role, excluding 'SuperAdmin'
    if (rolesArray.includes("Admin")) {
      whereClause.role = {
        [Op.like]: `%Admin%`, // Search for 'Admin'
        [Op.notLike]: `%SuperAdmin%`, // Exclude 'SuperAdmin'
      };
    }
  }

  if (forAccounts) {
    whereClause.role = {
      [Op.or]: accountRoles.map((accountRole) => ({
        [Op.like]: `%${accountRole}%`,
      })),
    };
  }

  return await getEmployees(whereClause, role, departmentCode);
}
// ! Employee END

// ! Campus START
async function getAllCampusActive() {
  const campuses = await db.Campus.findAll({
    where: {
      isActive: true,
      isDeleted: false,
    },
  });
  return campuses;
}
// ! Campus END

// ! Department START
function transformDepartmentData(department) {
  return {
    ...department.toJSON(),
    fullDepartmentNameWithCampus:
      `${department.departmentCode} - ${department.departmentName} - ${department.campus.campusName}` ||
      "fullDepartmentNameWithCampus not found",
    campusName: department.campus.campusName || "campusName not found",
  };
}

async function getDepartments(whereClause) {
  const departments = await db.Department.findAll({
    where: whereClause,
    include: [
      {
        model: db.Campus,
        attributes: ["campusName"], // Include only the campus name
      },
    ],
  });

  return departments.map(transformDepartmentData);
}

async function getAllDepartmentsActive(campus_id = null, campusName = null) {
  const whereClause = {isActive: true, isDeleted: false};

  if (campus_id) {
    whereClause.campus_id = campus_id;
  } else if (campusName) {
    const campus = await db.Campus.findOne({
      where: {campusName: campusName},
    });

    if (!campus) {
      throw new Error(`Campus with name "${campusName}" not found.`);
    }
    whereClause.campus_id = campus.campus_id;
  }

  return await getDepartments(whereClause);
}
// ! Department END

// ! Program START
function transformProgramData(program) {
  return {
    ...program.toJSON(),
    fullDepartmentNameWithCampus:
      `${program.department.departmentCode} - ${program.department.departmentName} - ${program.department.campus.campusName}` ||
      "fullDepartmentNameWithCampus not found",
    fullProgramDescriptionWithCampus:
      `${program.programCode} - ${program.programDescription} - ${program.department.departmentName} - ${program.department.campus.campusName}` ||
      "fullProgramDescriptionWithCampus not found",
  };
}

function getIncludeConditionsForCampus(campus_id, campusName) {
  const includeConditions = [
    {
      model: db.Department,
      include: [
        {
          model: db.Campus,
          attributes: ["campusName", "campus_id"], // Include only the campus name
        },
      ],
      attributes: ["departmentName", "departmentCode"], // Include department name and code
    },
  ];

  if (campus_id) {
    includeConditions[0].where = {campus_id: campus_id};
  } else if (campus_id && campusName) {
    includeConditions[0].where = {campus_id: campus_id};
    includeConditions[0].where = {campusName: campusName};
  } else if (campusName && !(campus_id && campusName)) {
    throw new Error(`You cannot put only one parameter ("${campusName}")`);
  }

  return includeConditions;
}

async function getPrograms(whereClause, campus_id = null, campusName = null) {
  const includeConditions = getIncludeConditionsForCampus(
    campus_id,
    campusName
  );

  await validateCampus(campus_id, campusName);

  const programs = await db.Program.findAll({
    where: whereClause,
    include: includeConditions,
  });

  return programs.map(transformProgramData);
}

async function validateCampus(campus_id, campusName) {
  if (campus_id && campusName) {
    const campus = await db.Campus.findOne({
      where: {campus_id, campusName},
    });

    if (!campus) {
      throw new Error(
        `Campus with ID "${campus_id}" and Name "${campusName}" does not match.`
      );
    }
  }
}

async function getAllProgramsActive(campus_id = null, campusName = null) {
  const whereClause = {isActive: true, isDeleted: false};

  return await getPrograms(whereClause, campus_id, campusName);
}
// ! Program END

// ! Classes START
function transformClassData(cls) {
  let roles = cls.employee.role
    ? cls.employee.role.split(",").map((r) => r.trim())
    : [];

  const validRoles = [
    Role.SuperAdmin,
    Role.Admin,
    Role.MIS,
    Role.Registrar,
    Role.DataCenter,
    Role.Dean,
    Role.Accounting,
  ];

  // Filter roles to keep only valid ones
  const forValidRoles = roles.filter((role) => validRoles.includes(role));

  // Get the first valid role if available
  const firstValidRole = roles.length > 0 ? roles[0] : null;

  // Handle qualifications, parse the string into an array if needed
  let qualificationsArray = [];
  if (typeof cls.employee.qualifications === "string") {
    try {
      qualificationsArray = JSON.parse(cls.employee.qualifications);
    } catch (error) {
      console.error("Error parsing qualifications:", error);
      qualificationsArray = []; // Handle the error by returning an empty array
    }
  } else if (Array.isArray(cls.employee.qualifications)) {
    qualificationsArray = cls.employee.qualifications;
  }

  // Check if qualifications exist and map the abbreviations
  const qualifications =
    qualificationsArray.length > 0
      ? `, (${qualificationsArray.map((q) => q.abbreviation).join(", ")})`
      : "";

  return {
    ...cls.toJSON(),
    instructureFullName:
      `${cls.employee.title} ${cls.employee.firstName}${
        cls.employee.middleName != null
          ? ` ${`${cls.employee.middleName[0]}.`}`
          : ""
      } ${cls.employee.lastName}${qualifications}` || null,
    instructureFullNameWithRole:
      `${cls.employee.title} ${cls.employee.firstName}${
        cls.employee.middleName != null
          ? ` ${`${cls.employee.middleName[0]}.`}`
          : ""
      } ${cls.employee.lastName}${qualifications} - ${
        firstValidRole ? firstValidRole : forValidRoles
      }` || null,
    instructorName:
      `${cls.employee.firstName}${
        cls.employee.middleName != null
          ? ` ${`${cls.employee.middleName[0]}.`}`
          : ""
      } ${cls.employee.lastName}` || null,
    schoolYear: cls.semester.schoolYear,
    semesterName: cls.semester.semesterName,
    campusName: cls.semester.campus.campusName,
    subjectCode: cls.courseinfo.courseCode,
    subjectDescription: cls.courseinfo.courseDescription,
    schedule: cls.schedule,
  };
}

// Common function to get classes based on filter conditions
async function getClasses(whereClause, campus_id = null) {
  const includeConditions = [
    {
      model: db.Employee,
      attributes: [
        "title",
        "firstName",
        "middleName",
        "lastName",
        "role",
        "qualifications",
      ],
    },
    {
      model: db.Semester,
      attributes: ["schoolYear", "semesterName"],
      include: [{model: db.Campus, attributes: ["campusName"]}],
    },
  ];

  if (campus_id) {
    includeConditions.push({
      model: db.CourseInfo,
      where: {campus_id: campus_id},
      attributes: ["courseCode", "courseDescription"], // Include course details
    });
  } else {
    includeConditions.push({
      model: db.CourseInfo,
      attributes: ["courseCode", "courseDescription"], // Include course details
    });
  }

  const classes = await db.Class.findAll({
    where: whereClause,
    include: includeConditions,
  });

  return classes.map(transformClassData);
}

async function getAllClassActive(campus_id = null, campusName = null) {
  const whereClause = {isActive: true, isDeleted: false};

  if (campusName) {
    const campus = await db.Campus.findOne({where: {campusName}});
    if (!campus) {
      throw new Error(`Campus '${campusName}' not found`);
    }
    campus_id = campus.campus_id;
  }

  return await getClasses(whereClause, campus_id);
}
// ! Classes END
