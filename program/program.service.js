const {Op, literal, col} = require("sequelize");
const db = require("_helpers/db");

module.exports = {
  createProgram,
  getAllPrograms,
  getAllProgramsCount,
  getAllProgramsActive,
  getAllProgramsDeleted,
  getProgramById,
  updateProgram,
};

async function createProgram(params) {
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

// Common function to get programs based on filter conditions
async function getPrograms(whereClause) {
  const programs = await db.Program.findAll({
    where: whereClause,
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

  return programs.map(transformProgramData);
}

async function getAllPrograms() {
  return await getPrograms({isDeleted: false});
}

async function getAllProgramsCount() {
  return await db.Program.count({
    where: {isActive: true, isDeleted: false},
  });
}

async function getAllProgramsActive() {
  return await getPrograms({isActive: true, isDeleted: false});
}

async function getAllProgramsDeleted() {
  return await getPrograms({isDeleted: true});
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

async function updateProgram(id, params) {
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
    return;
  }

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
}
