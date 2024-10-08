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
          where: {prospectus_id: prospectus_id},
          include: [
            {
              model: db.Program,
              required: true,
              include: [
                {
                  model: db.Department,
                  where: {campus_id: campus_id},
                  required: true,
                  include: [
                    {
                      model: db.Campus,
                      required: true,
                      where: {campus_id: campus_id},
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
        } else if (!prospectus.program || !prospectus.program.department) {
          return {
            error: `Prospectus with ID "${prospectus_id}" does not belong to a valid department on campus ID "${campus_id}".`,
          };
        }

        // Ensure subjectCode is an array
        const subjectCodesArray = Array.isArray(subjectCode)
          ? subjectCode
          : [subjectCode];

        // Check if the courses exist for the specified campus
        const subjects = await db.CourseInfo.findAll({
          where: {
            courseCode: subjectCodesArray,
            campus_id: campus_id, // Ensure that the subjects are linked to the specified campus
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

        // Check for existing ProspectusSubjects and throw an error if already assigned
        const existingAssignments = await db.ProspectusSubject.findAll({
          where: {
            prospectus_id: prospectus_id,
            course_id: subjects.map((subject) => subject.course_id),
          },
        });

        if (existingAssignments.length > 0) {
          return {
            error: `Some of the subject codes are already assigned to Prospectus "${prospectus_id}" on campus "${campus_id}".`,
          };
        }

        // Bulk insert the ProspectusSubject records and retrieve their IDs
        const insertedProspectusSubjects =
          await db.ProspectusSubject.bulkCreate(
            subjects.map((subject) => ({
              prospectus_id: prospectus_id,
              yearLevel: yearLevel,
              course_id: subject.course_id,
              isActive: true,
              isDeleted: false,
            })),
            {returning: true}
          );

        // Map the subject codes to their corresponding prospectus_subject_id
        const subjectCodeToIdMap = {};
        insertedProspectusSubjects.forEach((record) => {
          const subject = subjects.find(
            (sub) => sub.course_id === record.course_id
          );
          if (subject) {
            subjectCodeToIdMap[subject.courseCode] =
              record.prospectus_subject_id;
          }
        });

        // Insert prerequisites for each ProspectusSubject
        for (const preReq of preRequisite || []) {
          const preReqProspectusSubjectId =
            subjectCodeToIdMap[preReq.prospectus_subject_code];
          if (!preReqProspectusSubjectId) {
            return {
              error: `Cannot find the prospectus_subject_id for subject code "${preReq.prospectus_subject_code}".`,
            };
          }

          const preRequisiteSubjects = await db.CourseInfo.findAll({
            where: {
              courseCode: preReq.subjectCode,
              campus_id: campus_id,
            },
          });

          const preRequisiteData = preRequisiteSubjects.map((subject) => ({
            prospectus_subject_id: preReqProspectusSubjectId,
            course_id: subject.course_id,
            isActive: true,
            isDeleted: false,
          }));

          await db.PreRequisite.bulkCreate(preRequisiteData);
        }

        return {prospectus_id, yearLevel, subjects};
      });
    })
  );

  // Check for validation errors
  const validationError = validationResults.find((result) => result.error);
  if (validationError) {
    throw new Error(validationError.error);
  }

  // Prepare data for bulk insert into ProspectusSubject table.
  const insertedProspectusSubjects = validationResults.flatMap((result) =>
    result.subjects.map((subject) => ({
      prospectus_id: result.prospectus_id,
      yearLevel: result.yearLevel,
      course_id: subject.course_id,
      isActive: true,
      isDeleted: false,
    }))
  );
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
    order : [["yearLevel", "ASC"], ["prospectus_subject_id", "ASC"] ],
  });

  return prospectusSubjects.map(transformProspectusSubjectData);
}
