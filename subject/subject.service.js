const {Op} = require("sequelize");
const db = require("_helpers/db");
const Role = require("_helpers/role");

module.exports = {
  getAllSubject,
  createSubject,
  getSubjectById,
  updateSubject,
};

async function createSubject(params) {
  const subject = new db.SubjectInfo(params);

  // save subject
  await subject.save();
}

async function getAllSubject() {
  const subject = await db.SubjectInfo.findAll();

  return subject;
}

async function getSubjectById(id) {
  const subject = await db.SubjectInfo.findByPk(id);
  if (!subject) throw "Subject not found";
  return subjectBasicDetails;
}

async function updateSubject(id, params) {
  const subject = await getSubjectById(id);

  if (!subject) throw "Subject not found";

  Object.assign(subject, params);
  await subject.save();
}

