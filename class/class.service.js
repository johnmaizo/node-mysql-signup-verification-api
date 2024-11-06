const {Op, where, col, fn, literal} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

const deepEqual = require("deep-equal");

module.exports = {
  createClass,
  getAllClass,
  getAllClassActive,
  getAllClassDeleted,
  getAllClassCount,
  getClassById,
  updateClass,
};

// async function createClass(params) {
async function createClass(params, accountId) {
  // Start a transaction to ensure atomicity
  const transaction = await db.sequelize.transaction();

  try {
    // 1. Check if a class with the same name already exists
    const existingClass = await db.Class.findOne({
      where: {className: params.className},
      transaction,
    });

    if (existingClass) {
      throw new Error(
        `Class with the name "${params.className}" already exists.`
      );
    }

    // 2. Fetch related data: Course, Semester, Employee, and Room
    const [course, semester, employee, room] = await Promise.all([
      db.CourseInfo.findByPk(params.course_id, {transaction}),
      db.Semester.findByPk(params.semester_id, {transaction}),
      db.Employee.findByPk(params.employee_id, {transaction}),
      db.BuildingStructure.findByPk(params.structure_id, {transaction}),
    ]);

    if (!course) {
      throw new Error(`Course with ID "${params.course_id}" not found.`);
    }

    if (!semester) {
      throw new Error(`Semester with ID "${params.semester_id}" not found.`);
    }

    // 3. Validate if the semester is active
    if (!semester.isActive) {
      throw new Error(
        `The semester with ID "${params.semester_id}" is not active. Please select an active semester.`
      );
    }

    if (!employee) {
      throw new Error(`Employee with ID "${params.employee_id}" not found.`);
    }

    if (!room) {
      throw new Error(`Room with ID "${params.structure_id}" not found.`);
    }

    // 4. Validate timeStart and timeEnd
    if (params.timeEnd <= params.timeStart) {
      throw new Error("Time End must be after Time Start.");
    }

    // 5. Ensure params.days is an array
    if (!Array.isArray(params.days)) {
      throw new Error("Invalid format for 'days'. It should be an array.");
    }

    // 6. Room conflict check
    const potentialConflicts = await db.Class.findAll({
      where: {
        structure_id: params.structure_id,
        semester_id: params.semester_id,
        isDeleted: false,
        timeStart: {
          [Op.lt]: params.timeEnd,
        },
        timeEnd: {
          [Op.gt]: params.timeStart,
        },
      },
      transaction,
    });

    const isRoomOverlap = potentialConflicts.some((cls) => {
      let classDays = [];

      if (typeof cls.days === "string") {
        // Adjust the splitting logic based on your actual data format
        classDays = cls.days.includes(",")
          ? cls.days.split(",").map((day) => day.trim())
          : cls.days.split("");
      } else if (Array.isArray(cls.days)) {
        classDays = cls.days;
      }

      // Check if any day overlaps
      return classDays.some((day) => params.days.includes(day));
    });

    if (isRoomOverlap) {
      throw new Error(
        `The room is already booked at the specified time and days for this semester.`
      );
    }

    // 7. Instructor conflict check
    const overlappingInstructorClasses = await db.Class.findOne({
      where: {
        employee_id: params.employee_id,
        semester_id: params.semester_id,
        isDeleted: false,
        days: {
          [Op.overlap]: params.days,
        },
        timeStart: {
          [Op.lt]: params.timeEnd,
        },
        timeEnd: {
          [Op.gt]: params.timeStart,
        },
      },
      transaction,
    });

    if (overlappingInstructorClasses) {
      throw new Error(
        `Instructor is already assigned to another class at the specified time and days for this semester.`
      );
    }

    // 8. Create the new class
    const newClass = await db.Class.create(params, {transaction});

    // 9. Log the creation action
    await db.History.create(
      {
        action: "create",
        entity: "Class",
        entityId: newClass.class_id,
        changes: params,
        accountId: accountId,
      },
      {transaction}
    );

    // Commit the transaction
    await transaction.commit();

    // Optionally, return the newly created class
    return newClass;
  } catch (error) {
    // Rollback the transaction in case of any errors
    await transaction.rollback();

    // Log the error for debugging purposes
    console.error("Error in createClass:", error);

    // Re-throw the error to be handled by the caller
    throw error;
  }
}

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

  // Convert timeStart and timeEnd to readable format
  const formatTime = (time) => {
    if (!time) return "";
    const [hour, minute] = time.split(":");
    let hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? "PM" : "AM";
    hourNum = hourNum % 12 || 12;
    return `${hourNum}:${minute} ${ampm}`;
  };

  const timeStartFormatted = formatTime(cls.timeStart);
  const timeEndFormatted = formatTime(cls.timeEnd);

  let daysArray = cls.days;

  if (typeof cls.days === "string") {
    try {
      daysArray = JSON.parse(cls.days);

      if (!Array.isArray(daysArray)) {
        console.error("Error: Parsed 'days' is not an array:", daysArray);
        daysArray = []; // Default to empty array if parsing doesn't return an array
      }
    } catch (error) {
      console.error("Error parsing 'days' field:", error);
      daysArray = []; // Default to empty array on parse failure
    }
  } else if (!Array.isArray(cls.days)) {
    console.error("Error: 'days' is neither a string nor an array:", cls.days);
    daysArray = []; // Default to empty array if 'days' is neither string nor array
  }

  // Now, safely use the join method
  const schedule =
    daysArray.length > 0
      ? `${daysArray.join(", ")} - ${timeStartFormatted} to ${timeEndFormatted}`
      : `No schedule information available`;

  return {
    ...cls.toJSON(),
    instructorFullName:
      `${cls.employee.title} ${cls.employee.firstName}${
        cls.employee.middleName != null
          ? ` ${`${cls.employee.middleName[0]}.`}`
          : ""
      } ${cls.employee.lastName}${qualifications}` || null,
    instructorFullNameWithRole:
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
    semester_id: cls.semester_id,
    schoolYear: cls.semester.schoolYear,
    semesterName: cls.semester.semesterName,
    campusName: cls.semester.campus.campusName,
    subjectCode: cls.courseinfo.courseCode,
    subjectDescription: cls.courseinfo.courseDescription,
    schedule: schedule,
    fullStructureDetails: `${
      (cls.buildingstructure.buildingName &&
        `${cls.buildingstructure.buildingName} `) ||
      ""
    }${
      (cls.buildingstructure.floorName &&
        `- ${cls.buildingstructure.floorName} `) ||
      ""
    }${
      (cls.buildingstructure.roomName &&
        `- ${cls.buildingstructure.roomName}`) ||
      ""
    }`.trim(),
    room:
      (cls.buildingstructure.roomName && cls.buildingstructure.roomName) || "",
    instructorFullNameWithDepartmentCode: `${cls.employee.title} ${
      cls.employee.firstName
    }${
      cls.employee.middleName != null
        ? ` ${`${cls.employee.middleName[0]}.`}`
        : ""
    } ${cls.employee.lastName}${qualifications} - ${
      cls.employee.department?.departmentCode || "Department code not found"
    }`,
  };
}

// Common function to get classes based on filter conditions
async function getClasses(whereClause, campus_id = null, schoolYear = null) {
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
      include: [
        {
          model: db.Department,
          attributes: ["departmentCode", "departmentName"],
        },
      ],
    },
    {
      model: db.Semester,
      attributes: ["schoolYear", "semesterName"],
      include: [{model: db.Campus, attributes: ["campusName"]}],
      where: {},
    },
    {
      model: db.BuildingStructure,
      attributes: ["buildingName", "floorName", "roomName"],
    },
  ];

  if (schoolYear) {
    includeConditions[1].where.schoolYear = schoolYear;
  }

  if (campus_id) {
    includeConditions.push({
      model: db.CourseInfo,
      where: {campus_id: campus_id},
      attributes: ["courseCode", "courseDescription", "unit"],
    });
  } else {
    includeConditions.push({
      model: db.CourseInfo,
      attributes: ["courseCode", "courseDescription", "unit"],
    });
  }

  const classes = await db.Class.findAll({
    where: whereClause,
    include: includeConditions,
  });

  return classes.map(transformClassData);
}

async function getAllClass(
  campus_id = null,
  schoolYear = null,
  semester_id = null
) {
  const whereClause = {isDeleted: false};

  if (semester_id) {
    whereClause.semester_id = semester_id;
  }

  return await getClasses(whereClause, campus_id, schoolYear);
}

async function getAllClassActive(
  campus_id = null,
  schoolYear = null,
  semester_id = null
) {
  const whereClause = {isActive: true, isDeleted: false};

  if (semester_id) {
    whereClause.semester_id = semester_id;
  }

  if (campus_id) {
    whereClause.campus_id = campus_id;
  }

  return await getClasses(whereClause, campus_id, schoolYear);
}

async function getAllClassDeleted(
  campus_id = null,
  schoolYear = null,
  semester_id = null
) {
  const whereClause = {isDeleted: true};

  if (semester_id) {
    whereClause.semester_id = semester_id;
  }

  if (campus_id) {
    whereClause.campus_id = campus_id;
  }

  return await getClasses(whereClause, campus_id, schoolYear);
}

async function getAllClassCount(campus_id = null) {
  const whereClause = {isActive: true, isDeleted: false};

  if (campus_id) {
    whereClause.campus_id = campus_id;
  }

  return await db.CourseInfo.count({
    where: whereClause,
  });
}

async function getClassById(id) {
  const cls = await db.Class.findByPk(id, {
    include: [
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
        include: [
          {model: db.Campus, attributes: ["campusName"]},
          {
            model: db.Department,
            attributes: ["departmentName", "departmentCode"],
          },
        ],
      },
      {
        model: db.Semester,
        attributes: ["schoolYear", "semesterName"],
        include: [{model: db.Campus, attributes: ["campusName"]}],
      },
      {
        model: db.CourseInfo,
        attributes: ["courseCode", "courseDescription"],
      },
      {
        model: db.BuildingStructure,
      },
    ],
  });

  if (!cls) throw "Class not found";
  return transformClassData(cls);
}

async function updateClass(id, params, accountId) {
  // Find the class to be updated
  const cls = await db.Class.findByPk(id);
  if (!cls) throw "Class not found";

  // Log the original state before update
  const originalData = {...cls.dataValues};

  // Update the class with new parameters
  Object.assign(cls, params);

  // Validate timeStart and timeEnd
  if (cls.timeEnd <= cls.timeStart) {
    throw "Time End must be after Time Start.";
  }

  // Validate overlapping schedules
  // Similar logic as in createClass function

  // Save the updated class
  await cls.save();

  // Check if there are actual changes
  const hasChanges = !deepEqual(originalData, cls.dataValues);

  if (hasChanges) {
    // Log the update action with changes
    const changes = {
      original: originalData,
      updated: params,
    };

    // Log the update action
    await db.History.create({
      action: "update",
      entity: "Class",
      entityId: cls.class_id,
      changes: changes,
      accountId: accountId,
    });
  }
}
