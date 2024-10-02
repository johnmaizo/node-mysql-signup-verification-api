const {Op, where} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

module.exports = {
  getAllEmployee,
  getAllEmployeeActive,
};

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
