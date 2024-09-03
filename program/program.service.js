const {Op} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

const deepEqual = require("deep-equal");

module.exports = {
  createProgram,
  getAllPrograms,
  getAllProgramsCount,
  getAllProgramsActive,
  getAllProgramsDeleted,
  getProgramById,
  updateProgram,
};

async function createProgram(params, adminId) {
  // Find the department based on department code, department name, and campus information
  const department = await db.Department.findOne({
    where: {
      departmentCode: params.departmentCode,
      departmentName: params.departmentName,
    },
    include: [
      {
        model: db.Campus,
        where: {
          campusName: params.campusName,
        },
      },
    ],
  });

  if (!department) {
    throw new Error(
      `Department "${params.departmentName}" not found in Campus "${params.campusName}".`
    );
  }

  // Check if the programCode already exists for the found department_id
  const existingProgram = await db.Program.findOne({
    where: {
      programCode: params.programCode,
      department_id: department.department_id, // Ensure it checks within the correct department
    },
  });

  if (existingProgram) {
    throw new Error(
      `Program Code "${params.programCode}" already exists for Department "${params.departmentName}" (Code: ${params.departmentCode}), Campus "${params.campusName}".`
    );
  }

  // Set the department_id in the params before creating the program
  params.department_id = department.department_id;

  // Create new program
  const program = new db.Program(params);

  // Save program
  await program.save();

  // Log the creation action
  await db.History.create({
    action: "create",
    entity: "Program",
    entityId: program.program_id,
    changes: params,
    adminId: adminId,
  });
}

// Common function to handle the transformation
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

// Helper function to generate include conditions for campus filtering
function getIncludeConditionsForCampus(campus_id, campusName) {
  const includeConditions = [
    {
      model: db.Department,
      include: [
        {
          model: db.Campus,
          attributes: ["campusName"], // Include only the campus name
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

// Function to validate campusName and campus_id match
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

// Reuse the existing getPrograms function
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

async function getAllPrograms(campus_id = null, campusName = null) {
  const whereClause = {isDeleted: false};

  return await getPrograms(whereClause, campus_id, campusName);
}

async function getAllProgramsCount(campus_id = null, campusName = null) {
  const whereClause = {isActive: true, isDeleted: false};

  await validateCampus(campus_id, campusName);

  const includeConditions = getIncludeConditionsForCampus(
    campus_id,
    campusName
  );

  return await db.Program.count({
    where: whereClause,
    include: includeConditions,
  });
}

async function getAllProgramsActive(campus_id = null, campusName = null) {
  const whereClause = {isActive: true, isDeleted: false};

  return await getPrograms(whereClause, campus_id, campusName);
}

async function getAllProgramsDeleted(campus_id = null, campusName = null) {
  const whereClause = {isDeleted: true};

  return await getPrograms(whereClause, campus_id, campusName);
}

async function getProgramById(id) {
  const program = await db.Program.findByPk(id, {
    include: [
      {
        model: db.Department,
        include: [
          {
            model: db.Campus,
            attributes: ["campusName"], // Include only the campus name
          },
        ],
        attributes: ["departmentName", "departmentCode"], // Include department name and code
      },
    ],
  });

  if (!program) throw new Error("Program not found");

  return transformProgramData(program);
}

async function updateProgram(id, params, adminId) {
  // Fetch the program as a Sequelize instance
  const program = await db.Program.findByPk(id, {
    include: [
      {
        model: db.Department,
        include: [
          {
            model: db.Campus,
            attributes: ["campusName"], // Include only the campus name
          },
        ],
        attributes: ["departmentName", "departmentCode"], // Include only the department name and code
      },
    ],
  });

  if (!program) throw new Error("Program not found");

  // Check if the action is only to delete the program
  if (params.isDeleted !== undefined) {
    if (params.isDeleted && program.isActive) {
      throw new Error(
        `You must set the Status of "${program.programDescription}" to Inactive before you can delete this program.`
      );
    }

    Object.assign(program, {isDeleted: params.isDeleted});
    await program.save();

    // Log the update action
    await db.History.create({
      action: "update",
      entity: "Program",
      entityId: program.program_id,
      changes: params,
      adminId: adminId,
    });

    return;
  }

  // Log the original state before update
  const originalData = {...program.dataValues};

  // Find the department based on department code, department name, and campus information
  const department = await db.Department.findOne({
    where: {
      departmentCode: params.departmentCode,
      departmentName: params.departmentName,
    },
    include: [
      {
        model: db.Campus,
        where: {
          campusName: params.campusName,
        },
      },
    ],
  });

  if (!department) {
    throw new Error(
      `Department "${params.departmentName}" not found in Campus "${params.campusName}".`
    );
  }

  // Check if the programCode already exists for the found department_id and it's not the same program being updated
  const existingProgram = await db.Program.findOne({
    where: {
      programCode: params.programCode,
      department_id: department.department_id,
      program_id: {[Op.ne]: id},
    },
  });

  if (existingProgram) {
    throw new Error(
      `Program Code "${params.programCode}" already exists for Department "${params.departmentName}" (Code: ${params.departmentCode}), Campus "${params.campusName}".`
    );
  }

  // Set the department_id in the params before updating the program
  params.department_id = department.department_id;

  // Update program with new params
  Object.assign(program, params);
  await program.save();

  // Check if there are actual changes
  const hasChanges = !deepEqual(originalData, program.dataValues);

  if (hasChanges) {
    // Log the update action with changes
    const changes = {
      original: originalData,
      updated: params,
    };

    // Log the update action
    await db.History.create({
      action: "update",
      entity: "Program",
      entityId: program.program_id,
      changes: changes,
      adminId: adminId,
    });
  }
}
