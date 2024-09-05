const {Op} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

const deepEqual = require("deep-equal");

module.exports = {
  createTeacher,
  getAllTeachers,
  getAllTeachersCount,
  getAllTeachersActive,
  getAllTeachersDeleted,
  getTeacherById,
  updateTeacher,
};

async function createTeacher(params, adminId) {
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

  // Check if the Email already exists for the found department_id
  const existingTeacher = await db.TeacherInfo.findOne({
    where: {
      email: params.email,
      department_id: department.department_id, // Ensure it checks within the correct department
    },
  });

  if (existingTeacher) {
    throw new Error(
      `Teacher email "${params.email}" already exists for Department "${params.departmentName}" (Code: ${params.departmentCode}), Campus "${params.campusName}".`
    );
  }

  // Set the department_id in the params before creating the teacher
  params.department_id = department.department_id;

  // Create new teacher
  const teacher = new db.TeacherInfo(params);

  // Save teacher
  await teacher.save();

  // Log the creation action
  await db.History.create({
    action: "create",
    entity: "Teacher",
    entityId: teacher.teacher_id,
    changes: params,
    adminId: adminId,
  });
}

// Common function to handle the transformation
function transformTeacherData(teacher) {
  return {
    ...teacher.toJSON(),
    fullDepartmentNameWithCampus:
      `${teacher.department.departmentCode} - ${teacher.department.departmentName} - ${teacher.department.campus.campusName}` ||
      "fullDepartmentNameWithCampus not found",
    fullTeacherDescriptionWithCampus:
      `${teacher.firstName} ${teacher.middleName} ${teacher.lastName} - ${teacher.department.departmentCode} - ${teacher.department.departmentName} - ${teacher.department.campus.campusName}` ||
      "fullTeacherDescriptionWithCampus not found",
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

// Reuse the existing getTeachers function
async function getTeachers(whereClause, campus_id = null, campusName = null) {
  const includeConditions = getIncludeConditionsForCampus(
    campus_id,
    campusName
  );

  await validateCampus(campus_id, campusName);

  const teachers = await db.TeacherInfo.findAll({
    where: whereClause,
    include: includeConditions,
  });

  return teachers.map(transformTeacherData);
}

async function getAllTeachers(campus_id = null, campusName = null) {
  const whereClause = {isDeleted: false};

  return await getTeachers(whereClause, campus_id, campusName);
}

async function getAllTeachersCount(campus_id = null, campusName = null) {
  const whereClause = {isActive: true, isDeleted: false};

  await validateCampus(campus_id, campusName);

  const includeConditions = getIncludeConditionsForCampus(
    campus_id,
    campusName
  );

  return await db.TeacherInfo.count({
    where: whereClause,
    include: includeConditions,
  });
}

async function getAllTeachersActive(campus_id = null, campusName = null) {
  const whereClause = {isActive: true, isDeleted: false};

  return await getTeachers(whereClause, campus_id, campusName);
}

async function getAllTeachersDeleted(campus_id = null, campusName = null) {
  const whereClause = {isDeleted: true};

  return await getTeachers(whereClause, campus_id, campusName);
}

async function getTeacherById(id, campusName = null) {
  let teacher;

  if (campusName) {
    teacher = await db.TeacherInfo.findOne({
      where: {teacher_id: id}, // Ensure the teacher ID matches
      include: [
        {
          model: db.Department,
          include: [
            {
              model: db.Campus,
              where: {campusName}, // Ensure the teacher is on the specific campus
              attributes: ["campusName", "campus_id"], // Include only the campus name
            },
          ],
          attributes: ["departmentName", "departmentCode"], // Include department name and code
        },
      ],
    });

    if (!teacher.department) {
      throw new Error(
        `No Teacher found with id "${id}" on campus ${campusName}`
      );
    }
  } else {
    teacher = await db.TeacherInfo.findByPk(id, {
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
  }

  if (!teacher) throw new Error("Teacher not found");

  return transformTeacherData(teacher);
}
async function updateTeacher(id, params, adminId) {
  // Fetch the teacher as a Sequelize instance
  const teacher = await db.TeacherInfo.findByPk(id, {
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

  if (!teacher) throw new Error("Teacher not found");

  // Check if the action is only to delete the teacher
  if (params.isDeleted !== undefined) {
    if (params.isDeleted && teacher.isActive) {
      throw new Error(
        `You must set the Status of "${teacher.firstName} $${teacher.lastName}" to Inactive before you can delete this teacher.`
      );
    }

    Object.assign(teacher, {isDeleted: params.isDeleted});
    await teacher.save();

    // Log the update action
    await db.History.create({
      action: "update",
      entity: "Teacher",
      entityId: teacher.teacher_id,
      changes: params,
      adminId: adminId,
    });

    return;
  }

  // Log the original state before update
  const originalData = {...teacher.dataValues};

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

  // Check if the Email already exists for the found department_id and it's not the same teacher being updated
  const existingTeacher = await db.TeacherInfo.findOne({
    where: {
      email: params.email,
      department_id: department.department_id,
      teacher_id: {[Op.ne]: id},
    },
  });

  if (existingTeacher) {
    throw new Error(
      `Teacher Email "${params.email}" already exists for Department "${params.departmentName}" (Code: ${params.departmentCode}), Campus "${params.campusName}".`
    );
  }

  // Set the department_id in the params before updating the teacher
  params.department_id = department.department_id;

  // Update teacher with new params
  Object.assign(teacher, params);
  await teacher.save();

  // Check if there are actual changes
  const hasChanges = !deepEqual(originalData, teacher.dataValues);

  if (hasChanges) {
    // Log the update action with changes
    const changes = {
      original: originalData,
      updated: params,
    };

    // Log the update action
    await db.History.create({
      action: "update",
      entity: "Teacher",
      entityId: teacher.teacher_id,
      changes: changes,
      adminId: adminId,
    });
  }
}
