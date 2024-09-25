const {Op, where} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

const deepEqual = require("deep-equal");

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
  // Convert role to an array if it is not already
  let roleArray = Array.isArray(params.role) ? params.role : [params.role];

  // Define role priorities
  const rolePriority = ["SuperAdmin", "Admin", "DataCenter", "Registrar"];

  // Filter roles to find relevant ones
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

  // If the roleArray contains "SuperAdmin", set campus_id to null
  if (roleArray.includes("SuperAdmin")) {
    params.campus_id = null; // Set campus_id to null for SuperAdmin
  } else {
    // Get the campusName based on campus_id and validate
    const campus = await db.Campus.findByPk(params.campus_id);
    if (!campus) {
      throw `Campus with ID "${params.campus_id}" not found.`;
    }
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
}

// Common function to handle the transformation
function transformEmployeeData(employee) {
  return {
    ...employee.toJSON(),
    fullName:
      `${employee.firstName} ${employee.lastName}` || "Full name not found",
    campusName: employee.campus?.campusName || "Campus name not found",
  };
}

// Common function to get employees based on filter conditions
async function getEmployees(whereClause) {
  const employees = await db.Employee.findAll({
    where: whereClause,
    include: [
      {
        model: db.Campus,
        attributes: ["campusName"], // Include only the campus name
      },
    ],
  });

  return employees.map(transformEmployeeData);
}

async function getAllEmployee(campus_id = null) {
  const whereClause = {isDeleted: false};

  if (campus_id) {
    whereClause.campus_id = campus_id;
  }

  return await getEmployees(whereClause);
}

async function getAllEmployeeActive(campus_id = null) {
  const whereClause = {isActive: true, isDeleted: false};

  if (campus_id) {
    whereClause.campus_id = campus_id;
  }

  return await getEmployees(whereClause);
}

async function getAllEmployeeDeleted(campus_id = null) {
  const whereClause = {isDeleted: true};

  if (campus_id) {
    whereClause.campus_id = campus_id;
  }

  return await getEmployees(whereClause);
}

async function getAllEmployeeCount(campus_id = null) {
  const whereClause = {isActive: true, isDeleted: false};

  if (campus_id) {
    whereClause.campus_id = campus_id;
  }

  return await db.Employee.count({
    where: whereClause,
  });
}

async function getEmployeeById(id) {
  const employee = await db.Employee.findByPk(id, {
    include: [
      {
        model: db.Campus,
        attributes: ["campusName"], // Include only the campus name
      },
    ],
  });

  if (!employee) throw new Error("Employee not found");

  return transformEmployeeData(employee);
}

async function updateEmployee(id, params, accountId) {
  const employee = await getEmployeeById(id);

  if (!employee) throw "Employee not found";

  // Convert role to an array if it is not already
  const roleArray = Array.isArray(params.role) ? params.role : [params.role];

  // Convert the role array to a comma-separated string if it's an array
  params.role = roleArray.join(", ");

  // Check if the action is only to delete the employee
  if (params.isDeleted !== undefined) {
    if (params.isDeleted && employee.isActive) {
      throw new Error(
        `You must set the Status of Employee "${employee.firstName} ${employee.lastName}" to Inactive before you can delete this employee.`
      );
    }

    Object.assign(employee, {isDeleted: params.isDeleted});
    await employee.save();

    // Log the update action
    await db.History.create({
      action: "update",
      entity: "Employee",
      entityId: employee.employee_id,
      changes: {isDeleted: params.isDeleted},
      accountId: accountId,
    });

    return;
  }

  // Log the original state before update
  const originalData = {...employee.dataValues};

  // If firstName or lastName are not provided, use existing values
  const firstName = params.firstName || employee.firstName;
  const lastName = params.lastName || employee.lastName;
  const campus_id = params.campus_id || employee.campus_id;

  // Validate if firstName and lastName combination exists for another employee
  const existingEmployee = await db.Employee.findOne({
    where: {
      firstName: firstName,
      lastName: lastName,
      campus_id: campus_id,
      employee_id: {[Op.ne]: id}, // Ensure the employee being updated is excluded from this check
    },
  });

  if (existingEmployee) {
    throw `Employee "${firstName} ${lastName}" already exists on this campus.`;
  }

  // Update employee with new params
  Object.assign(employee, params);
  await employee.save();

  // Check if there are actual changes
  const hasChanges = !deepEqual(originalData, employee.dataValues);

  if (hasChanges) {
    // Log the update action with changes
    const changes = {
      original: originalData,
      updated: params,
    };

    // Log the update action
    await db.History.create({
      action: "update",
      entity: "Employee",
      entityId: employee.employee_id,
      changes: changes,
      accountId: accountId,
    });
  }
}
