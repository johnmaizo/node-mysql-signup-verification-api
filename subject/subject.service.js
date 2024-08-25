const {Op} = require("sequelize");
const db = require("_helpers/db");

module.exports = {
  createSubject,
  getAllSubject,
  getAllSubjectActive,
  getAllSubjectDeleted,
  getSubjectById,
  updateSubject,
};

async function createSubject(params) {
  // Fetch course_id based on courseName
  const course = await db.Course.findOne({
    where: {
      courseName: params.courseName, // Match the exact courseName
    },
  });

  if (!course) {
    throw `Course with name "${params.courseName}" not found.`;
  }

  // Assign the course_id to params
  params.course_id = course.course_id;

  const subject = new db.SubjectInfo(params);

  // Save subject
  await subject.save();
}

async function getAllSubject() {
  const subjects = await db.SubjectInfo.findAll({
    where: {
      isDeleted: false,
    },
  });
  return subjects;
}

async function getAllSubjectActive() {
  const subjects = await db.SubjectInfo.findAll({
    where: {
      isActive: true,
      isDeleted: false,
    },
  });
  return subjects;
}

async function getAllSubjectDeleted() {
  const subjects = await db.SubjectInfo.findAll({
    where: {
      isDeleted: true,
    },
  });
  return subjects;
}

async function getSubjectById(id) {
  const subject = await db.SubjectInfo.findByPk(id);
  if (!subject) throw "Subject not found";
  return subject;
}

async function updateSubject(id, params) {
  const subject = await getSubjectById(id);

  if (!subject) throw "Subject not found";

  // Check if the action is only to delete the subject
  if (params.isDeleted !== undefined) {
    // Validation: Ensure isActive is set to false before deleting
    if (params.isDeleted && subject.isActive) {
      throw `You must set the Status of "${subject.subjectDescription}" to Inactive before you can delete this subject.`;
    }

    // Proceed with deletion or reactivation
    Object.assign(subject, {isDeleted: params.isDeleted});
    await subject.save();
    return;
  }

  // Fetch course_id based on updated courseName if provided
  if (params.courseName) {
    const course = await db.Course.findOne({
      where: {
        courseName: params.courseName, // Match the exact courseName
      },
    });

    if (!course) {
      throw `Course with name "${params.courseName}" not found.`;
    }

    params.course_id = course.course_id;
  }

  // Update subject with new params
  Object.assign(subject, params);
  await subject.save();
}
