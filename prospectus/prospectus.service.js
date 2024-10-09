const {Op, where} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

const deepEqual = require("deep-equal");

module.exports = {
  createProspectus,
  getAllProspectus,
  getAllProspectusActive,
  getAllProspectusDeleted,
  getAllProspectusCount,
  getProspectusById,
  updateProspectus,

  // ! Prospectus Assign Subject
  createProspectusAssignSubject,
  getAllProspectusSubjects,
  getProspectusSubjectByProspectusId,
};

// async function createProspectus(params, accountId) {
async function createProspectus(params) {
  // Fetch the campus by name
  const campus = await db.Campus.findOne({
    where: {campusName: params.campusName},
    attributes: ["campusName", "campus_id"],
  });

  if (!campus) {
    throw `Campus not found.`;
  }

  // Fetch the program along with department and campus
  const program = await db.Program.findOne({
    where: {program_id: params.program_id},
    include: [
      {
        model: db.Department,
        where: {campus_id: campus.campus_id}, // Ensure the program's department belongs to the specified campus
        attributes: ["departmentName", "departmentCode"],
      },
    ],
  });

  if (!program) {
    throw `Program not found.`;
  } else if (!program.department) {
    throw `Program does not belong to the specified campus "${params.campusName}".`;
  }

  // Check if the prospectus already exists for this program on the campus
  const existingProspectus = await db.Prospectus.findOne({
    where: {
      prospectusName: params.prospectusName,
      program_id: program.program_id, // Ensure we are checking for the same program
    },
    include: [
      {
        model: db.Program,
        include: [
          {
            model: db.Department,
            where: {campus_id: campus.campus_id}, // Ensure it's within the same campus
          },
        ],
      },
    ],
  });

  if (existingProspectus) {
    throw `Prospectus name "${params.prospectusName}" is already registered for Campus "${params.campusName}".`;
  }

  // Create the new prospectus
  const newProspectus = await db.Prospectus.create({
    ...params,
    program_id: program.program_id, // Explicitly set the program_id
  });

  // Fetch the created prospectus with the associated program
  const prospectusWithProgram = await db.Prospectus.findOne({
    where: {prospectus_id: newProspectus.prospectus_id},
    include: [
      {
        model: db.Program,
        include: [
          {
            model: db.Department,
            include: [
              {
                model: db.Campus,
                attributes: ["campusName", "campus_id"],
              },
            ],
            attributes: ["departmentName", "departmentCode"],
          },
        ],
        attributes: ["programCode", "program_id"], // Adjust based on actual Program column names
      },
    ],
  });

  // Return or log the result
  console.log(prospectusWithProgram.toJSON());
  return prospectusWithProgram;
}

function transformProspectusData(prospectus) {
  return {
    ...prospectus.toJSON(),
    campusName: prospectus?.program?.department?.campus?.campusName || null,
  };
}

async function getAllProspectus(campus_id = null) {
  const prospectus = await db.Prospectus.findAll({
    where: {
      isDeleted: false,
    },
    include: [
      {
        model: db.Program,
        required: true,
        include: [
          {
            model: db.Department,
            required: true,
            where: campus_id ? {campus_id: campus_id} : null,
            include: [
              {
                model: db.Campus,
                required: true,
                where: campus_id ? {campus_id: campus_id} : null,
              },
            ],
          },
        ],
      },
    ],
  });

  return prospectus.map(transformProspectusData);
}

async function getAllProspectusActive(campus_id = null) {
  const prospectus = await db.Prospectus.findAll({
    where: {
      isActive: true,
      isDeleted: false,
    },
    include: [
      {
        model: db.Program,
        required: true,
        include: [
          {
            model: db.Department,
            required: true,
            where: campus_id ? {campus_id: campus_id} : null,
            include: [
              {
                model: db.Campus,
                required: true,
                where: campus_id ? {campus_id: campus_id} : null,
              },
            ],
          },
        ],
      },
    ],
  });

  return prospectus.map(transformProspectusData);
}

async function getAllProspectusDeleted(campus_id = null) {
  const prospectus = await db.Prospectus.findAll({
    where: {
      isDeleted: true,
    },
    include: [
      {
        model: db.Program,
        required: true,
        include: [
          {
            model: db.Department,
            required: true,
            where: campus_id ? {campus_id: campus_id} : null,
            include: [
              {
                model: db.Campus,
                required: true,
                where: campus_id ? {campus_id: campus_id} : null,
              },
            ],
          },
        ],
      },
    ],
  });

  return prospectus.map(transformProspectusData);
}

async function getAllProspectusCount(campus_id = null) {
  const count = await db.Prospectus.count({
    where: {
      isActive: true,
      isDeleted: false,
    },
    include: [
      {
        model: db.Program,
        required: true,
        include: [
          {
            model: db.Department,
            required: true,
            where: campus_id ? {campus_id: campus_id} : null,
            include: [
              {
                model: db.Campus,
                required: true,
                where: campus_id ? {campus_id: campus_id} : null,
              },
            ],
          },
        ],
      },
    ],
  });

  return count;
}

async function getProspectusById(id) {
  const prospectus = await db.Prospectus.findOne({
    where: {
      prospectus_id: id,
      isDeleted: false,
    },
    include: [
      {
        model: db.Program,
        required: true,
        attributes: ["program_id"],
        include: [
          {
            model: db.Department,
            required: true,
            attributes: ["department_id"],
            include: [
              {
                model: db.Campus,
                required: true,
                attributes: ["campusName"],
              },
            ],
          },
        ],
      },
    ],
  });

  if (!prospectus) throw "Prospectus not found";
  return transformProspectusData(prospectus);
}

async function updateProspectus(id, params, accountId) {
  // Fetch the prospectus by its ID
  const prospectus = await db.Prospectus.findByPk(id);

  if (!prospectus) {
    throw `Prospectus with ID "${id}" not found.`;
  }

  // If the action is to delete the prospectus
  if (params.isDeleted !== undefined) {
    if (params.isDeleted && prospectus.isActive) {
      throw new Error(
        `You must set the Status of "${prospectus.prospectusName}" to Inactive before you can delete this prospectus.`
      );
    }

    // Set the prospectus as deleted and save
    Object.assign(prospectus, {isDeleted: params.isDeleted});
    await prospectus.save();

    // Log the deletion action
    await db.History.create({
      action: "delete",
      entity: "Prospectus",
      entityId: prospectus.prospectus_id,
      changes: params,
      accountId: accountId,
    });

    return;
  }

  // Fetch the program along with department and campus details to verify the update conditions
  const program = await db.Program.findOne({
    where: {program_id: params.program_id},
    include: [
      {
        model: db.Department,
        include: [
          {
            model: db.Campus,
            where: {campusName: params.campusName},
            attributes: ["campusName"],
          },
        ],
        attributes: ["departmentName", "departmentCode"],
      },
    ],
  });

  // Check if the program, department, and campus exist
  if (!program) {
    throw `Program not found.`;
  } else if (!program.department) {
    throw `Program does not belong to the specified campus "${params.campusName}". Please check the campus name or the program and try again.`;
  }

  // Log the original state before update
  const originalData = {...prospectus.dataValues};

  // Update the prospectus with the new params
  Object.assign(prospectus, params);
  await prospectus.save();

  // Check if there are actual changes made to the prospectus
  const hasChanges = !deepEqual(originalData, prospectus.dataValues);

  if (hasChanges) {
    // Log the update action with changes
    const changes = {
      original: originalData,
      updated: params,
    };

    await db.History.create({
      action: "update",
      entity: "Prospectus",
      entityId: prospectus.prospectus_id,
      changes: changes,
      accountId: accountId,
    });
  }
}

// ! Prospectus Assign Sujbect
async function createProspectusAssignSubject(params, accountId) {
  const pLimit = await import("p-limit");

  // Limit concurrency for parallel operations
  const limit = pLimit.default(5);

  // Assuming params is an array of objects with campus_id, prospectus_id, yearLevel, subjectCode, and preRequisite
  const data = Array.isArray(params) ? params : [params];

  // Validate each prospectus entry and handle prerequisites
  const validationResults = await Promise.all(
    data.map(async (entry) => {
      return limit(async () => {
        const {campus_id, prospectus_id, yearLevel, subjectCode, preRequisite} =
          entry;

        // Check if the prospectus exists and is linked to the specified campus
        const prospectus = await db.Prospectus.findOne({
          where: {prospectus_id},
          include: [
            {
              model: db.Program,
              required: true,
              include: [
                {
                  model: db.Department,
                  required: true,
                  where: {campus_id},
                  include: [
                    {
                      model: db.Campus,
                      attributes: ["campusName"],
                      required: true,
                    },
                  ],
                },
              ],
            },
          ],
        });

        if (!prospectus) {
          return {
            error: `Prospectus with ID "${prospectus_id}" not found for campus ID "${campus_id}".`,
          };
        }

        // Ensure subjectCode is an array
        const subjectCodesArray = Array.isArray(subjectCode)
          ? subjectCode
          : [subjectCode];

        // Check if all subjects are valid for the specified campus
        const subjects = await db.CourseInfo.findAll({
          where: {
            courseCode: subjectCodesArray,
            campus_id,
          },
        });

        // Create a map of subject codes for quick validation
        const validSubjectCodes = subjects.map((subject) => subject.courseCode);
        const invalidSubjectCodes = subjectCodesArray.filter(
          (code) => !validSubjectCodes.includes(code)
        );

        if (invalidSubjectCodes.length > 0) {
          return {
            error: `Invalid subject codes: ${invalidSubjectCodes.join(
              ", "
            )} for campus ID "${campus_id}".`,
          };
        }

        // Check if any of these courses are already assigned to the prospectus
        const existingAssignments = await db.ProspectusSubject.findAll({
          where: {
            prospectus_id,
            course_id: subjects.map((subject) => subject.course_id),
          },
        });

        if (existingAssignments.length > 0) {
          const existingCourses = existingAssignments.map(
            (assignment) => assignment.course_id
          );
          const existingCourseCodes = subjects
            .filter((subject) => existingCourses.includes(subject.course_id))
            .map((subject) => subject.courseCode);

          return {
            error: `Course(s) "${existingCourseCodes.join(
              ", "
            )}" is already assigned to Prospectus "${
              prospectus.prospectusName
            }" on campus "${prospectus.program.department.campus.campusName}".`,
          };
        }

        // Return the data to be used for insertion
        return {prospectus_id, yearLevel, subjects};
      });
    })
  );

  // Check for validation errors
  const validationError = validationResults.find((result) => result.error);
  if (validationError) {
    throw new Error(validationError.error);
  }

  // Prepare the data for bulk insertion into the ProspectusSubject table
  const prospectusSubjects = validationResults.flatMap((result) =>
    result.subjects.map((subject) => ({
      prospectus_id: result.prospectus_id,
      yearLevel: result.yearLevel,
      course_id: subject.course_id,
      isActive: true,
      isDeleted: false,
    }))
  );

  // Bulk insert the data into the ProspectusSubject table
  const insertedProspectusSubjects = await db.ProspectusSubject.bulkCreate(
    prospectusSubjects,
    {returning: true}
  );

  // Now handle prerequisite validation and insertion
  const preRequisiteData = [];
  await Promise.all(
    data.map(async (entry) => {
      const {prospectus_id, preRequisite} = entry;

      if (preRequisite && Array.isArray(preRequisite)) {
        for (const prereq of preRequisite) {
          const {prospectus_subject_code, subjectCode: prereqSubjectCodes} =
            prereq;

          // Find prospectus_subject_id based on prospectus_subject_code
          const preReqProspectusSubject = await db.ProspectusSubject.findOne({
            where: {
              prospectus_id,
            },
            include: [
              {
                model: db.CourseInfo,
                where: {
                  courseCode: prospectus_subject_code,
                },
                attributes: ["courseCode"],
              },
            ],
          });

          if (!preReqProspectusSubject) {
            throw new Error(
              `Prospectus subject with course code "${prospectus_subject_code}" not found for prospectus ID "${prospectus_id}".`
            );
          }

          // Validate the prerequisite subject codes
          const prereqSubjects = await db.CourseInfo.findAll({
            where: {
              courseCode: prereqSubjectCodes,
              campus_id: entry.campus_id, // Use the campus_id from the current entry
            },
          });

          const validPrereqCodes = prereqSubjects.map(
            (subject) => subject.courseCode
          );
          const invalidPrereqCodes = prereqSubjectCodes.filter(
            (code) => !validPrereqCodes.includes(code)
          );

          if (invalidPrereqCodes.length > 0) {
            throw new Error(
              `Invalid prerequisite subject codes: ${invalidPrereqCodes.join(
                ", "
              )} for prospectus subject course code "${prospectus_subject_code}".`
            );
          }

          // Add to the prerequisite data array for later insertion
          preRequisiteData.push(
            ...prereqSubjects.map((subject) => ({
              prospectus_subject_id:
                preReqProspectusSubject.prospectus_subject_id,
              course_id: subject.course_id,
              isActive: true,
              isDeleted: false,
            }))
          );
        }
      }
    })
  );

  // Insert prerequisite data into the prospectus_pre_requisite table
  if (preRequisiteData.length > 0) {
    await db.PreRequisite.bulkCreate(preRequisiteData);
  }

  // Log history actions for each inserted record
  const historyLogs = insertedProspectusSubjects.map((prospectusSubject) => ({
    action: "create",
    entity: "ProspectusSubject",
    entityId: prospectusSubject.prospectus_subject_id,
    changes: {
      prospectus_id: prospectusSubject.prospectus_id,
      yearLevel: prospectusSubject.yearLevel,
      course_id: prospectusSubject.course_id,
    },
    accountId: accountId,
  }));

  // Bulk insert history logs
  await db.History.bulkCreate(historyLogs);

  return insertedProspectusSubjects;
}

function transformProspectusSubjectData(prospectusSubject) {
  return {
    ...prospectusSubject.toJSON(),
    prospectusSubjectCodoe: prospectusSubject.courseinfo.courseCode || null,
    prospectusSubjectDescription:
      prospectusSubject.courseinfo.courseDescription || null,
    prospectusSubjectUnit: prospectusSubject.courseinfo.unit || null,
    prerequisites: prospectusSubject.prospectus_pre_requisites
      ? prospectusSubject.prospectus_pre_requisites.map((prerequisite) => ({
          courseCode: prerequisite.courseinfo?.courseCode || null,
        }))
      : [],
    campusName:
      prospectusSubject?.prospectu?.program?.department?.campus?.campusName ||
      null,
  };
}

async function getAllProspectusSubjects(campus_id = null) {
  const prospectusSubjects = await db.ProspectusSubject.findAll({
    where: {
      isDeleted: false,
    },
    include: [
      {
        model: db.PreRequisite,
        required: false, // Include prerequisites even if they don't exist
        include: [
          {
            model: db.CourseInfo,
            required: false, // Include course info for each prerequisite
            attributes: [
              "course_id",
              "courseCode",
              "courseDescription",
              "unit",
            ],
          },
        ],
        attributes: ["pre_requisite_id"],
      },
      {
        model: db.Prospectus,
        required: true,
        include: [
          {
            model: db.Program,
            required: true,
            include: [
              {
                model: db.Department,
                required: true,
                where: campus_id ? {campus_id: campus_id} : null,
                include: [
                  {
                    model: db.Campus,
                    required: true,
                    where: campus_id ? {campus_id: campus_id} : null,
                    attributes: ["campusName"],
                  },
                ],
                attributes: [
                  "department_id",
                  "departmentCode",
                  "departmentName",
                ],
              },
            ],
            attributes: ["program_id", "programCode", "programDescription"],
          },
        ],
        attributes: [
          "prospectus_id",
          "prospectusName",
          "prospectusDescription",
        ],
      },
      {
        model: db.CourseInfo,
        required: false,
        attributes: ["course_id", "courseCode", "courseDescription", "unit"],
      },
    ],
    order: [
      ["yearLevel", "ASC"],
      ["prospectus_subject_id", "ASC"],
    ],
  });

  return prospectusSubjects.map(transformProspectusSubjectData);
}

async function getProspectusSubjectByProspectusId(prospectus_id) {
  const prospectusSubjects = await db.ProspectusSubject.findAll({
    where: {
      prospectus_id: prospectus_id,
      isDeleted: false,
    },
    include: [
      {
        model: db.PreRequisite,
        required: false, // Include prerequisites if they exist
        include: [
          {
            model: db.CourseInfo,
            required: false, // Include course info for each prerequisite
            attributes: ["courseCode", "courseDescription", "unit"],
          },
        ],
        attributes: ["pre_requisite_id"],
      },
      {
        model: db.Prospectus,
        required: true,
        include: [
          {
            model: db.Program,
            required: true,
            include: [
              {
                model: db.Department,
                required: true,
                include: [
                  {
                    model: db.Campus,
                    required: true,
                    attributes: ["campusName"],
                  },
                ],
                attributes: ["department_id"],
              },
            ],
            attributes: ["program_id"],
          },
        ],
        attributes: ["prospectus_id", "prospectusName"],
      },
      {
        model: db.CourseInfo,
        required: false,
        attributes: ["courseCode", "courseDescription", "unit"],
      },
    ],
    order: [
      ["yearLevel", "ASC"],
      ["prospectus_subject_id", "ASC"],
    ],
  });

  if (!prospectusSubjects || prospectusSubjects.length === 0)
    throw "No prospectus subjects found";
  return prospectusSubjects.map(transformProspectusSubjectData);
}
