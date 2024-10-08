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

async function createProspectus(params, accountId) {
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

  return await db.History.create({
    action: "create",
    entity: "Prospectus",
    entityId: newProspectus.prospectus_id,
    changes: params,
    accountId: accountId,
  });
}

function transformProspectusData(prospectus) {
  return {
    ...prospectus.toJSON(),
    campusName: prospectus?.program?.department?.campus?.campusName || null,
    fullDepartmentNameWithCampusForSubject: prospectus?.program?.department
      ? `${prospectus?.program?.department.departmentCode} - ${prospectus?.program?.department.departmentName} - ${prospectus?.program?.department.campus.campusName}`
      : null,
  };
}

async function getAllProspectus(
  campus_id = null,
  campusName = null,
  programCode = null,
  program_id = null
) {
  // Validate Campus
  const campusWhereClause = {};
  if (campus_id) campusWhereClause.campus_id = campus_id;
  if (campusName) campusWhereClause.campusName = campusName;

  const campus = await db.Campus.findOne({
    where: campusWhereClause,
  });

  if (!campus) {
    throw new Error(
      "Campus not found with the provided campus_id and/or campusName"
    );
  }

  // Validate Program
  const programWhereClause = {};
  if (program_id) programWhereClause.program_id = program_id;
  if (programCode) programWhereClause.programCode = programCode;

  const program = await db.Program.findOne({
    where: programWhereClause,
    include: [
      {
        model: db.Department,
        required: true,
        include: [
          {
            model: db.Campus,
            required: true,
            where: campusWhereClause,
          },
        ],
      },
    ],
  });

  if (!program) {
    throw new Error(
      "Program not found with the provided program_id and/or programCode, or it is not associated with the specified campus."
    );
  }

  // If validation passes, proceed to find the Prospectus
  const prospectus = await db.Prospectus.findAll({
    where: {
      isDeleted: false,
    },
    include: [
      {
        model: db.Program,
        required: true,
        where: programWhereClause,
        include: [
          {
            model: db.Department,
            required: true,
            include: [
              {
                model: db.Campus,
                required: true,
                where: campusWhereClause,
              },
            ],
          },
        ],
      },
    ],
  });

  return prospectus.map(transformProspectusData);
}

async function getAllProspectusActive(
  campus_id = null,
  campusName = null,
  programCode = null,
  program_id = null
) {
  // Validate Campus
  const campusWhereClause = {};
  if (campus_id) campusWhereClause.campus_id = campus_id;
  if (campusName) campusWhereClause.campusName = campusName;

  const campus = await db.Campus.findOne({
    where: campusWhereClause,
  });

  if (!campus) {
    throw new Error(
      "Campus not found with the provided campus_id and/or campusName"
    );
  }

  // Validate Program
  const programWhereClause = {};
  if (program_id) programWhereClause.program_id = program_id;
  if (programCode) programWhereClause.programCode = programCode;

  const program = await db.Program.findOne({
    where: programWhereClause,
    include: [
      {
        model: db.Department,
        required: true,
        include: [
          {
            model: db.Campus,
            required: true,
            where: campusWhereClause,
          },
        ],
      },
    ],
  });

  if (!program) {
    throw new Error(
      "Program not found with the provided program_id and/or programCode, or it is not associated with the specified campus."
    );
  }

  // Fetch Active Prospectus
  const prospectus = await db.Prospectus.findAll({
    where: {
      isActive: true,
      isDeleted: false,
    },
    include: [
      {
        model: db.Program,
        required: true,
        where: programWhereClause,
        include: [
          {
            model: db.Department,
            required: true,
            include: [
              {
                model: db.Campus,
                required: true,
                where: campusWhereClause,
              },
            ],
          },
        ],
      },
    ],
  });

  return prospectus.map(transformProspectusData);
}

async function getAllProspectusDeleted(
  campus_id = null,
  campusName = null,
  programCode = null,
  program_id = null
) {
  // Validate Campus
  const campusWhereClause = {};
  if (campus_id) campusWhereClause.campus_id = campus_id;
  if (campusName) campusWhereClause.campusName = campusName;

  const campus = await db.Campus.findOne({
    where: campusWhereClause,
  });

  if (!campus) {
    throw new Error(
      "Campus not found with the provided campus_id and/or campusName"
    );
  }

  // Validate Program
  const programWhereClause = {};
  if (program_id) programWhereClause.program_id = program_id;
  if (programCode) programWhereClause.programCode = programCode;

  const program = await db.Program.findOne({
    where: programWhereClause,
    include: [
      {
        model: db.Department,
        required: true,
        include: [
          {
            model: db.Campus,
            required: true,
            where: campusWhereClause,
          },
        ],
      },
    ],
  });

  if (!program) {
    throw new Error(
      "Program not found with the provided program_id and/or programCode, or it is not associated with the specified campus."
    );
  }

  // Fetch Deleted Prospectus
  const prospectus = await db.Prospectus.findAll({
    where: {
      isDeleted: true,
    },
    include: [
      {
        model: db.Program,
        required: true,
        where: programWhereClause,
        include: [
          {
            model: db.Department,
            required: true,
            include: [
              {
                model: db.Campus,
                required: true,
                where: campusWhereClause,
              },
            ],
          },
        ],
      },
    ],
  });

  return prospectus.map(transformProspectusData);
}

async function getAllProspectusCount(
  campus_id = null,
  campusName = null,
  programCode = null,
  program_id = null
) {
  // Validate Campus
  const campusWhereClause = {};
  if (campus_id) campusWhereClause.campus_id = campus_id;
  if (campusName) campusWhereClause.campusName = campusName;

  const campus = await db.Campus.findOne({
    where: campusWhereClause,
  });

  if (!campus) {
    throw new Error(
      "Campus not found with the provided campus_id and/or campusName"
    );
  }

  // Validate Program
  const programWhereClause = {};
  if (program_id) programWhereClause.program_id = program_id;
  if (programCode) programWhereClause.programCode = programCode;

  const program = await db.Program.findOne({
    where: programWhereClause,
    include: [
      {
        model: db.Department,
        required: true,
        include: [
          {
            model: db.Campus,
            required: true,
            where: campusWhereClause,
          },
        ],
      },
    ],
  });

  if (!program) {
    throw new Error(
      "Program not found with the provided program_id and/or programCode, or it is not associated with the specified campus."
    );
  }

  // Count Active Prospectus
  const count = await db.Prospectus.count({
    where: {
      isActive: true,
      isDeleted: false,
    },
    include: [
      {
        model: db.Program,
        required: true,
        where: programWhereClause,
        include: [
          {
            model: db.Department,
            required: true,
            include: [
              {
                model: db.Campus,
                required: true,
                where: campusWhereClause,
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
  const limit = pLimit.default(5);
  const data = Array.isArray(params) ? params : [params];
  const validYearLevelPattern = /^(\d+)(st|nd|rd|th) Year$/;

  function logDebug(message, data) {
    console.log(`[DEBUG] ${message}`, data || "");
  }

  const validationResults = await Promise.all(
    data.map(async (entry) => {
      return limit(async () => {
        const {campus_id, prospectus_id, yearLevel, subjectCode, preRequisite} =
          entry;

        logDebug("Processing entry", {campus_id, prospectus_id, yearLevel});

        if (!validYearLevelPattern.test(yearLevel)) {
          return {
            error: `Invalid yearLevel format "${yearLevel}". Accepted format is "1st Year", "2nd Year", "3rd Year", and so on.`,
          };
        }

        if (yearLevel !== "1st Year") {
          const firstYearExists = await db.ProspectusSubject.findOne({
            where: {
              prospectus_id,
              yearLevel: "1st Year",
            },
          });

          if (!firstYearExists) {
            logDebug("1st Year not found for prospectus", {
              prospectus_id,
              campus_id,
            });
            return {
              error: `You cannot create "${yearLevel}" because "1st Year" does not exist for Prospectus ID "${prospectus_id}" on Campus ID "${campus_id}". Please create "1st Year" first.`,
            };
          }
        }

        const existingYearLevel = await db.ProspectusSubject.findOne({
          where: {
            prospectus_id,
            yearLevel,
          },
        });

        if (existingYearLevel) {
          logDebug("Year level already exists", {yearLevel, prospectus_id});
          return {
            error: `Year Level "${yearLevel}" already exists for Prospectus ID "${prospectus_id}" on Campus ID "${campus_id}".`,
          };
        }

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
                },
              ],
            },
          ],
        });

        if (!prospectus) {
          logDebug("Prospectus not found", {prospectus_id, campus_id});
          return {
            error: `Prospectus with ID "${prospectus_id}" not found for campus ID "${campus_id}".`,
          };
        }

        const subjectCodesArray = Array.isArray(subjectCode)
          ? subjectCode
          : [subjectCode];
        const subjects = await db.CourseInfo.findAll({
          where: {
            courseCode: subjectCodesArray,
            campus_id,
          },
        });

        const validSubjectCodes = subjects.map((subject) => subject.courseCode);
        const invalidSubjectCodes = subjectCodesArray.filter(
          (code) => !validSubjectCodes.includes(code)
        );

        if (invalidSubjectCodes.length > 0) {
          logDebug("Invalid subject codes found", invalidSubjectCodes);
          return {
            error: `Invalid subject codes: ${invalidSubjectCodes.join(
              ", "
            )} for campus ID "${campus_id}".`,
          };
        }

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

          logDebug(
            "Courses already assigned to the prospectus",
            existingCourseCodes
          );
          return {
            error: `Course(s) "${existingCourseCodes.join(
              ", "
            )}" is already assigned to Prospectus "${
              prospectus.prospectusName
            }".`,
          };
        }

        // Fetch all prospectus subjects for validation of prerequisites
        const allProspectusSubjects = await db.ProspectusSubject.findAll({
          where: {
            prospectus_id,
            isActive: true,
            isDeleted: false,
          },
          include: [
            {
              model: db.CourseInfo,
              as: "CourseInfo", // Use the alias defined in the association
              attributes: ["courseCode"],
              required: true, // Ensure that only records with associated CourseInfo are included
            },
          ],
        });

        const prospectusSubjectCodes = allProspectusSubjects
          .map((ps) => ps.CourseInfo?.courseCode)
          .filter(Boolean);

        logDebug("Fetched prospectus subjects for validation", {
          totalFetched: allProspectusSubjects.length,
          subjectCodes: prospectusSubjectCodes,
        });

        // Validate prerequisites based on prospectus subjects
        if (preRequisite && Array.isArray(preRequisite)) {
          for (const prereq of preRequisite) {
            const {subjectCode: prereqSubjectCodes} = prereq;

            logDebug("Checking prerequisite subjects", prereqSubjectCodes);

            const invalidPrereqCodes = prereqSubjectCodes.filter(
              (code) => !prospectusSubjectCodes.includes(code)
            );

            if (invalidPrereqCodes.length > 0) {
              logDebug(
                "Invalid prerequisite subject codes found",
                invalidPrereqCodes
              );
              throw new Error(
                `Invalid prerequisite subject codes: ${invalidPrereqCodes.join(
                  ", "
                )}. These subjects must already exist in the prospectus subjects for prospectus ID "${prospectus_id}".`
              );
            }
          }
        }

        return {prospectus_id, yearLevel, subjects};
      });
    })
  );

  const validationError = validationResults.find((result) => result.error);
  if (validationError) {
    throw new Error(validationError.error);
  }

  const prospectusSubjects = validationResults.flatMap((result) =>
    result.subjects.map((subject) => ({
      prospectus_id: result.prospectus_id,
      yearLevel: result.yearLevel,
      course_id: subject.course_id,
      isActive: true,
      isDeleted: false,
    }))
  );

  const insertedProspectusSubjects = await db.ProspectusSubject.bulkCreate(
    prospectusSubjects,
    {returning: true}
  );

  const preRequisiteData = [];
  await Promise.all(
    data.map(async (entry) => {
      const {prospectus_id, yearLevel, preRequisite} = entry;

      if (yearLevel === "1st Year" && preRequisite && preRequisite.length > 0) {
        throw new Error(
          `Prerequisites cannot be added for "1st Year" courses.`
        );
      }

      if (preRequisite && Array.isArray(preRequisite)) {
        for (const prereq of preRequisite) {
          const {prospectus_subject_code, subjectCode: prereqSubjectCodes} =
            prereq;

          const preReqProspectusSubject = await db.ProspectusSubject.findOne({
            where: {
              prospectus_id,
            },
            include: [
              {
                model: db.CourseInfo,
                as: "CourseInfo", // Use the alias defined in your relationship
                where: {
                  courseCode: prospectus_subject_code,
                },
                attributes: ["courseCode"],
              },
            ],
          });

          if (!preReqProspectusSubject) {
            logDebug("Prerequisite course not found in prospectus", {
              prospectus_subject_code,
              prospectus_id,
            });
            throw new Error(
              `Prospectus subject with course code "${prospectus_subject_code}" not found for prospectus ID "${prospectus_id}".`
            );
          }

          const prereqSubjects = await db.CourseInfo.findAll({
            where: {
              courseCode: prereqSubjectCodes,
              campus_id: entry.campus_id,
            },
          });

          const validPrereqCodes = prereqSubjects.map(
            (subject) => subject.courseCode
          );
          const invalidPrereqCodes = prereqSubjectCodes.filter(
            (code) => !validPrereqCodes.includes(code)
          );

          if (invalidPrereqCodes.length > 0) {
            logDebug(
              "Invalid prerequisite codes found during final validation",
              invalidPrereqCodes
            );
            throw new Error(
              `Invalid prerequisite subject codes: ${invalidPrereqCodes.join(
                ", "
              )} for prospectus subject course code "${prospectus_subject_code}".`
            );
          }

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
  let insertedPreRequisites = [];
  if (preRequisiteData.length > 0) {
    // Perform the bulk insert without 'returning: true' since it may not be supported by your database
    await db.PreRequisite.bulkCreate(preRequisiteData);

    // Fetch the inserted PreRequisite records based on the data that was inserted
    insertedPreRequisites = await db.PreRequisite.findAll({
      where: {
        prospectus_subject_id: preRequisiteData.map(
          (preReq) => preReq.prospectus_subject_id
        ),
        course_id: preRequisiteData.map((preReq) => preReq.course_id),
      },
    });

    // Check if any records were actually fetched
    if (insertedPreRequisites.length === 0) {
      throw new Error("No PreRequisite records were found after insertion.");
    }

    // Log the fetched records to help with debugging
    console.log("[DEBUG] Fetched PreRequisite records:", insertedPreRequisites);
  }

  // Create history logs for the prerequisites based on the fetched PreRequisite records
  const preRequisiteHistoryLogs = insertedPreRequisites.map((preReq) => {
    if (!preReq.pre_requisite_id) {
      console.log(
        "[DEBUG] PreRequisite record missing pre_requisite_id:",
        preReq
      );
      throw new Error("PreRequisite record is missing a pre_requisite_id.");
    }

    return {
      action: "create",
      entity: "PreRequisite",
      entityId: preReq.pre_requisite_id,
      changes: {
        prospectus_subject_id: preReq.prospectus_subject_id,
        course_id: preReq.course_id,
        isActive: preReq.isActive,
        isDeleted: preReq.isDeleted,
      },
      accountId: accountId,
    };
  });

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

  // await db.History.bulkCreate(historyLogs);

  // Combine the prospectus subject history logs with the prerequisite history logs
  const allHistoryLogs = [...historyLogs, ...preRequisiteHistoryLogs];

  // Bulk insert all history logs
  await db.History.bulkCreate(allHistoryLogs);

  return insertedProspectusSubjects;
}

function transformProspectusSubjectData(prospectusSubject) {
  console.log(prospectusSubject.toJSON());

  return {
    prospectus_subject_id: prospectusSubject.prospectus_subject_id,
    prospectus_id: prospectusSubject.prospectus_id,
    yearLevel: prospectusSubject.yearLevel,
    course_id: prospectusSubject.course_id,
    isActive: prospectusSubject.isActive,
    isDeleted: prospectusSubject.isDeleted,
    createdAt: prospectusSubject.createdAt,
  updatedAt: prospectusSubject.updatedAt,
    courseCode: prospectusSubject.CourseInfo?.courseCode || null,
    courseDescription: prospectusSubject.CourseInfo?.courseDescription || null,
    unit: prospectusSubject.CourseInfo?.unit || null,
    prerequisites: prospectusSubject.prospectus_pre_requisites
      ? prospectusSubject.prospectus_pre_requisites.map((prerequisite) => ({
          pre_requisite_id: prerequisite.pre_requisite_id,
          courseCode: prerequisite.courseinfo?.courseCode || null,
          courseDescription: prerequisite.courseinfo?.courseDescription || null,
          unit: prerequisite.courseinfo?.unit || null,
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
        as: "CourseInfo",
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
        as: "CourseInfo",
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
