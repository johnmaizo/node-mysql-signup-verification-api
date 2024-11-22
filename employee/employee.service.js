const {Op, where} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

const deepEqual = require("deep-equal");
const { default: axios } = require("axios");

module.exports = {
  createEmployee,
  getAllEmployee,
  getAllEmployeeActive,
  getAllEmployeeDeleted,
  getAllEmployeeCount,
  getEmployeeById,
  updateEmployee,
};

async function createEmployee(params, accountId) {
  let roleArray = Array.isArray(params.role) ? params.role : [params.role];

  // Define roles that require department_id
  const rolesRequiringDepartment = ["Dean", "Instructor", "Teacher"];

  // Check if any of the roles requiring department_id are present in the roleArray
  const requiresDepartment = roleArray.some((role) =>
    rolesRequiringDepartment.includes(role)
  );

  // If one of the required roles is found and department_id is missing, throw an error
  if (requiresDepartment && !params.department_id) {
    throw "Department is required for roles: Dean, Instructor, or Teacher.";
  }

  const rolePriority = [
    "SuperAdmin",
    "Admin",
    "MIS",
    "DataCenter",
    "Registrar",
    "Accounting",
    "Dean",
    "Instructor",
    "Professor",
    "Teacher",
  ];

  const foundRoles = rolePriority.filter((role) => roleArray.includes(role));

  // If we found any relevant roles, re-arrange them according to the priority
  if (foundRoles.length > 0) {
    // First, remove found roles from the original array
    roleArray = roleArray.filter((role) => !foundRoles.includes(role));

    // Then prepend the found roles in the correct priority order
    roleArray = [...foundRoles, ...roleArray];
  }

  // Convert the role array back to a comma-separated string
  params.role = roleArray.join(", ");

  if (
    roleArray.includes("Dean") ||
    roleArray.includes("Teacher") ||
    roleArray.includes("Instructor") ||
    roleArray.includes("Professor") ||
    roleArray.includes("Teacher")
  ) {
    // Get the campusName based on campus_id and validate
    const campus = await db.Campus.findByPk(params.campus_id);
    if (!campus) {
      throw `Campus with ID "${params.campus_id}" not found.`;
    }

    // Get the departmentName based on department_id and validate
    const department = await db.Department.findByPk(params.department_id, {
      include: [
        {
          model: db.Campus,
          as: "campus",
          where: {
            campus_id: params.campus_id, // Use updated campus_id
          },
        },
      ],
    });
    if (!department) {
      throw `Department with ID "${params.department_id}" not found.`;
    }
  } else if (roleArray.includes("SuperAdmin")) {
    params.campus_id = null; // Set campus_id to null for SuperAdmin
    params.department_id = null; // Set department_id to null for SuperAdmin
  } else {
    // Get the campusName based on campus_id and validate
    const campus = await db.Campus.findByPk(params.campus_id);
    if (!campus) {
      throw `Campus with ID "${params.campus_id}" not found.`;
    }

    params.department_id = null;
  }

  // Validate if the employee already exists using both firstName and lastName
  const employeeExists = await db.Employee.findOne({
    where: {
      firstName: params.firstName,
      lastName: params.lastName,
      campus_id: params.campus_id, // Use updated campus_id
    },
  });

  if (employeeExists) {
    throw `Employee "${params.firstName} ${params.lastName}" is already registered on this campus.`;
  }

  // Create new employee record
  const employee = new db.Employee(params);

  // Save employee
  await employee.save();

  // Log the creation action
  await db.History.create({
    action: "create",
    entity: "Employee",
    entityId: employee.employee_id,
    changes: params,
    accountId: accountId,
  });

  // **New Code: Call the external API after actions are done**
  try {
    const fetch_employees_response = await axios.get(
      "https://xavgrading-api.onrender.com/external/fetch-employees"
    );

    console.log("fetch_employees_response:", fetch_employees_response.data);

    // Optionally, you can return or handle the response as needed
    return {
      status: "success",
      message: "Employee created successfully.",
      externalFetchResponse: fetch_employees_response.data,
    };
  } catch (error) {
    console.error(
      "Error fetching employees from external API:",
      error.response ? error.response.data : error.message
    );
    // Depending on your requirements, you can choose to throw an error, return a partial response, or ignore the error
    throw new Error(
      `Employee created, but failed to fetch employees from external API: ${
        error.response ? JSON.stringify(error.response.data) : error.message
      }`
    );
  }
}

// Common function to handle the transformation
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
    fullNameWithDepartmentCode: `${employee.title} ${employee.firstName}${
      employee.middleName != null ? ` ${`${employee.middleName[0]}.`}` : ""
    } ${employee.lastName}${qualifications} - ${
      employee.department?.departmentCode || "Department code not found"
    }`,
    fullDepartmentNameWithCampus:
      `${employee.department?.departmentCode} - ${employee.department?.departmentName} - ${employee.department?.campus?.campusName}` ||
      "Department name not found",
    campusName: employee.campus?.campusName || "Campus name not found",
    departmentCodeForClass: employee.department
      ? employee.department.departmentCode
      : null,
  };
}

// Common function to get employees based on filter conditions
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

// Main function to get all employees with optional campus_id and role filters
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
    "MIS",
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
    // "Dean", // Exclude 'Dean'
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

async function getAllEmployeeDeleted(
  campus_id = null,
  role = null,
  forAccounts = null,
  departmentCode = null
) {
  const whereClause = {isDeleted: true};

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

async function getAllEmployeeCount(
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

  return await db.Employee.count({
    where: whereClause,
    include: [
      {
        model: db.Department,
        where: departmentCode ? {code: departmentCode} : null,
      },
    ],
  });
}

async function getEmployeeById(id) {
  const employee = await db.Employee.findByPk(id, {
    include: [
      {
        model: db.Campus,
      },
      {
        model: db.Department,
        attributes: ["departmentName", "departmentCode"],
      },
    ],
  });

  if (!employee) throw new Error("Employee not found");

  return transformEmployeeData(employee);
}

async function updateEmployee(id, params, accountId) {
  const employee = await db.Employee.findByPk(id, {
    include: [
      {
        model: db.Campus,
      },
      {
        model: db.Department,
        attributes: ["departmentName", "departmentCode"],
      },
    ],
  });

  if (!employee) throw "Employee not found";

  // Convert role to an array if it is not already
  let roleArray = Array.isArray(params.role) ? params.role : [params.role];

  // Define roles that require department_id
  const rolesRequiringDepartment = ["Dean", "Instructor", "Teacher"];

  // Check if any of the roles requiring department_id are present in the roleArray
  const requiresDepartment = roleArray.some((role) =>
    rolesRequiringDepartment.includes(role)
  );

  // If one of the required roles is found and department_id is missing, throw an error
  if (requiresDepartment && !params.department_id) {
    throw "Department is required for roles: Dean, Instructor, or Teacher.";
  }

  const rolePriority = [
    "SuperAdmin",
    "Admin",
    "MIS",
    "DataCenter",
    "Registrar",
    "Accounting",
    "Dean",
    "Instructor",
    "Professor",
    "Teacher",
  ];

  const foundRoles = rolePriority.filter((role) => roleArray.includes(role));

  // If we found any relevant roles, re-arrange them according to the priority
  if (foundRoles.length > 0) {
    // First, remove found roles from the original array
    roleArray = roleArray.filter((role) => !foundRoles.includes(role));
    // Then prepend the found roles in the correct priority order
    roleArray = [...foundRoles, ...roleArray];
  }

  // Convert the role array back to a comma-separated string
  params.role = roleArray.join(", ");

  // Validate and adjust campus and department based on role
  if (
    roleArray.includes("Dean") ||
    roleArray.includes("Teacher") ||
    roleArray.includes("Instructor") ||
    roleArray.includes("Professor")
  ) {
    const campus = await db.Campus.findByPk(params.campus_id);
    if (!campus) {
      throw `Campus with ID "${params.campus_id}" not found.`;
    }

    const department = await db.Department.findByPk(params.department_id, {
      include: [
        {
          model: db.Campus,
          as: "campus",
          where: {
            campus_id: params.campus_id,
          },
        },
      ],
    });
    if (!department) {
      throw `Department with ID "${params.department_id}" not found.`;
    }
  } else if (roleArray.includes("SuperAdmin")) {
    params.campus_id = null;
    params.department_id = null;
  } else {
    const campus = await db.Campus.findByPk(params.campus_id);
    if (!campus) {
      throw `Campus with ID "${params.campus_id}" not found.`;
    }
    params.department_id = null;
  }

  // Validate if firstName and lastName combination exists for another employee
  const existingEmployee = await db.Employee.findOne({
    where: {
      firstName: params.firstName || employee.firstName,
      lastName: params.lastName || employee.lastName,
      campus_id: params.campus_id || employee.campus_id,
      employee_id: {[Op.ne]: id}, // Exclude the current employee
    },
  });
  if (existingEmployee) {
    throw `Employee "${params.firstName} ${params.lastName}" already exists on this campus.`;
  }

  // Log the original state before update
  const originalData = {...employee.dataValues};

  // Update employee with new params
  Object.assign(employee, params);
  await employee.save();

  // Check if there are actual changes
  const hasChanges = !deepEqual(originalData, employee.dataValues);
  if (hasChanges) {
    const changes = {
      original: originalData,
      updated: params,
    };
    await db.History.create({
      action: "update",
      entity: "Employee",
      entityId: employee.employee_id,
      changes: changes,
      accountId: accountId,
    });
  }
}
