const {Op, col} = require("sequelize");
const db = require("_helpers/db");

module.exports = {
  createSubject,
  getAllSubject,
  getAllSubjectCount,
  getAllSubjectActive,
  getAllSubjectDeleted,
  getSubjectById,
  updateSubject,
};

async function createSubject(params) {
  // Find the course first based on course, department, and campus information
  const course = await db.Course.findOne({
    where: {
      courseCode: params.courseCode,
      courseName: params.courseName,
    },
    include: [
      {
        model: db.Department,
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
      },
    ],
  });

  if (!course) {
    throw new Error(
      `Course "${params.courseName}" not found in Department "${params.departmentName}" and Campus "${params.campusName}".`
    );
  }

  // Check if the subjectCode already exists for the found course_id
  const existingSubject = await db.SubjectInfo.findOne({
    where: {
      subjectCode: params.subjectCode,
      course_id: course.course_id, // Ensure it checks within the correct course
    },
  });

  if (existingSubject) {
    throw new Error(
      `Subject Code "${params.subjectCode}" already exists for Course "${params.courseName}" (Code: ${params.courseCode}), Department "${params.departmentName}" (Code: ${params.departmentCode}), Campus "${params.campusName}".`
    );
  }

  // Set the course_id in the params before creating the subject
  params.course_id = course.course_id;

  // Create new subject
  const subject = new db.SubjectInfo(params);

  // Save subject
  await subject.save();
}

// Common function to handle the transformation
function transformSubjectData(subject) {
  return {
    ...subject.toJSON(),
    fullCourseNameWithCampus:
      `${subject.course.courseCode} - ${subject.course.courseName} - ${subject.course.department.campus.campusName}` ||
      "fullCourseNameWithCampus not found",
  };
}

// Common function to get subjects based on filter conditions
async function getSubjects(whereClause) {
  const subjects = await db.SubjectInfo.findAll({
    where: whereClause,
    include: [
      {
        model: db.Course,
        include: [
          {
            model: db.Department,
            include: [
              {
                model: db.Campus,
                attributes: ["campusName"], // Include only the campus name
              },
            ],
            attributes: ["departmentName", "departmentCode"],
          },
        ],
        attributes: ["courseCode", "courseName"], // Include only the course code and name
      },
    ],
  });

  return subjects.map(transformSubjectData);
}

async function getAllSubject() {
  return await getSubjects({isDeleted: false});
}

async function getAllSubjectCount() {
  return await db.SubjectInfo.count({
    where: {isActive: true, isDeleted: false},
  });
}

async function getAllSubjectActive() {
  return await getSubjects({isActive: true, isDeleted: false});
}

async function getAllSubjectDeleted() {
  return await getSubjects({isDeleted: true});
}

async function getSubjectById(id) {
  const subject = await db.SubjectInfo.findByPk(id, {
    include: [
      {
        model: db.Course,
        include: [
          {
            model: db.Department,
            include: [
              {
                model: db.Campus,
                attributes: ["campusName"], // Include only the campus name
              },
            ],
            attributes: ["departmentName", "departmentCode"], // Include only the department name
          },
        ],
        attributes: ["courseCode", "courseName"], // Include only the course code and name
      },
    ],
  });

  if (!subject) throw new Error("Subject not found");

  return transformSubjectData(subject);
}

async function updateSubject(id, params) {
  // Fetch the subject as a Sequelize instance
  const subject = await db.SubjectInfo.findByPk(id, {
    include: [
      {
        model: db.Course,
        include: [
          {
            model: db.Department,
            include: [
              {
                model: db.Campus,
                attributes: ["campusName"], // Include only the campus name
              },
            ],
            attributes: ["departmentName", "departmentCode"], // Include only the department name
          },
        ],
        attributes: ["courseCode", "courseName"], // Include only the course code and name
      },
    ],
  });

  if (!subject) throw new Error("Subject not found");

  // Check if the action is only to delete the subject
  if (params.isDeleted !== undefined) {
    if (params.isDeleted && subject.isActive) {
      throw new Error(
        `You must set the Status of "${subject.subjectDescription}" to Inactive before you can delete this subject.`
      );
    }

    Object.assign(subject, {isDeleted: params.isDeleted});
    await subject.save();
    return;
  }

  // Find the course based on course, department, and campus information
  const course = await db.Course.findOne({
    where: {
      courseCode: params.courseCode,
      courseName: params.courseName,
    },
    include: [
      {
        model: db.Department,
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
      },
    ],
  });

  if (!course) {
    throw new Error(
      `Course "${params.courseName}" not found in Department "${params.departmentName}" and Campus "${params.campusName}".`
    );
  }

  // Check if the subjectCode already exists for the found course_id and it's not the same subject being updated
  const existingSubject = await db.SubjectInfo.findOne({
    where: {
      subjectCode: params.subjectCode,
      course_id: course.course_id,
      subject_id: {[Op.ne]: id},
    },
  });

  if (existingSubject) {
    throw new Error(
      `Subject Code "${params.subjectCode}" already exists for Course "${params.courseName}" (Code: ${params.courseCode}), Department "${params.departmentName}" (Code: ${params.departmentCode}), Campus "${params.campusName}".`
    );
  }

  // Set the course_id in the params before updating the subject
  params.course_id = course.course_id;

  // Update subject with new params
  Object.assign(subject, params);
  await subject.save();
}
