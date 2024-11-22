const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const studentService = require("./student.service");

router.post(
  "/add-enrollment",
  authorize([
    Role.SuperAdmin,
    Role.Admin,
    Role.Registrar,
    Role.MIS,
    Role.Accounting,
  ]),
  addEnrollmentSchema,
  addEnrollment
);

router.get(
  "/official/:student_personal_id",
  authorize([
    Role.SuperAdmin,
    Role.Admin,
    Role.Registrar,
    Role.MIS,
    Role.Accounting,
  ]),
  getStudentOfficial
);

router.get(
  "/personal-data/:student_personal_id",
  // authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.MIS, Role.Accounting]),
  getStudentPersonalDataById
);

router.get(
  "/get-unenrolled-students",
  // authorize([
  //   Role.SuperAdmin,
  //   Role.Admin,
  //   Role.Registrar,
  //   Role.MIS,
  //   Role.Accounting,
  // ]),
  getUnenrolledStudents
);

router.get("/get-student-by-id", getStudentById);
router.get("/get-student-grades", getStudentGrades);


router.put(
  "/update-student",
  authorize([
    Role.SuperAdmin,
    Role.Admin,
    Role.Registrar,
    Role.MIS,
    Role.Accounting,
  ]),
  updateStudentSchema,
  updateStudentInformation
);

module.exports = router;

function getStudentOfficial(req, res, next) {
  const student_personal_id = parseInt(req.params.student_personal_id);
  studentService
    .getStudentOfficial(student_personal_id)
    .then((data) => res.json(data))
    .catch(next);
}

function getStudentById(req, res, next) {
  const {student_id, campus_id} = req.query;
  studentService
    .getStudentById(student_id, campus_id)
    .then((student) => res.json(student))
    .catch(next);
}

function getStudentGrades(req, res, next) {
  const { student_id, campus_id } = req.query;
  studentService
    .getStudentGrades(student_id, campus_id)
    .then((grades) => res.json(grades))
    .catch(next);
}

function getStudentPersonalDataById(req, res, next) {
  studentService
    .getStudentPersonalDataById(req.params.student_personal_id)
    .then((student) => (student ? res.json(student) : res.sendStatus(404)))
    .catch(next);
}

function updateStudentInformation(req, res, next) {
  studentService
    .updateStudentInformation(req.body, req.user.id)
    .then((result) => res.json({message: result.message}))
    .catch((error) => {
      console.error("Error response:", error.message);

      res.status(500).json({
        message: "Student update failed.",
        reason: error.message,
      });
    });
}

function addEnrollment(req, res, next) {
  studentService
    .addEnrollment(req.body, req.user.id)
    .then(() => res.json({message: "Enrollment added successfully."}))
    .catch(next);
}

function getUnenrolledStudents(req, res, next) {
  const {campus_id, existing_students, new_unenrolled_students} = req.query;
  studentService
    .getUnenrolledStudents(
      campus_id,
      existing_students,
      new_unenrolled_students
    )
    .then((students) => res.json(students))
    .catch(next);
}

// ! Schemas

function addEnrollmentSchema(req, res, next) {
  const schema = Joi.object({
    student_personal_id: Joi.number().required(),
    semester_id: Joi.number().required(),
  });
  validateRequest(req, next, schema);
}

function updateStudentSchema(req, res, next) {
  const schema = Joi.object({
    personalData: Joi.object({
      student_personal_id: Joi.number().integer().required(),
      enrollmentType: Joi.string().valid("online", "on-site").required(),
      applicant_id_for_online: Joi.number().optional().allow(null),
      campus_id: Joi.number().integer().required(),
      firstName: Joi.string().required(),
      middleName: Joi.string().optional().allow(null),
      lastName: Joi.string().required(),
      suffix: Joi.string().optional().allow(null),
      gender: Joi.string().required(),
      email: Joi.string().email().required(),
      contactNumber: Joi.string().required(),
      address: Joi.string().required(),
      birthDate: Joi.date().required(),
      civilStatus: Joi.string().required(),
      citizenship: Joi.string().required(),
      country: Joi.string().required(),
      birthPlace: Joi.string().required(),
      religion: Joi.string().required(),
      ACR: Joi.string().optional().allow(null),
    }).required(),

    addPersonalData: Joi.object({
      cityAddress: Joi.string().required(),
      cityTelNumber: Joi.string().optional().allow(null),
      provinceAddress: Joi.string().optional().allow(null),
      provinceTelNumber: Joi.string().optional().allow(null),
    }).optional(),

    familyDetails: Joi.object({
      fatherFirstName: Joi.string().optional().allow(null),
      fatherMiddleName: Joi.string().optional().allow(null),
      fatherLastName: Joi.string().optional().allow(null),
      fatherAddress: Joi.string().optional().allow(null),
      fatherOccupation: Joi.string().optional().allow(null),
      fatherContactNumber: Joi.string().optional().allow(null),
      fatherCompanyName: Joi.string().optional().allow(null),
      fatherCompanyAddress: Joi.string().optional().allow(null),
      fatherEmail: Joi.string().optional().allow(null),
      fatherIncome: Joi.string().optional().allow(null),

      motherFirstName: Joi.string().optional().allow(null),
      motherMiddleName: Joi.string().optional().allow(null),
      motherLastName: Joi.string().optional().allow(null),
      motherAddress: Joi.string().optional().allow(null),
      motherOccupation: Joi.string().optional().allow(null),
      motherContactNumber: Joi.string().optional().allow(null),
      motherCompanyName: Joi.string().optional().allow(null),
      motherCompanyAddress: Joi.string().optional().allow(null),
      motherEmail: Joi.string().optional().allow(null),
      motherIncome: Joi.string().optional().allow(null),

      guardianFirstName: Joi.string().optional().allow(null),
      guardianMiddleName: Joi.string().optional().allow(null),
      guardianLastName: Joi.string().optional().allow(null),
      guardianRelation: Joi.string().optional().allow(null),
      guardianContactNumber: Joi.string().optional().allow(null),
    }).optional(),

    academicBackground: Joi.object({
      program_id: Joi.number().integer().required(),
      prospectus_id: Joi.number().integer().required(),
      majorIn: Joi.string().optional().allow(null),
      studentType: Joi.string().valid("Regular", "Irregular").required(),
      applicationType: Joi.string()
        .valid("Freshmen", "Transferee", "Cross Enrollee")
        .required(),
      semester_id: Joi.number().integer().required(),
      yearLevel: Joi.string()
        .valid(
          "First Year",
          "Second Year",
          "Third Year",
          "Fourth Year",
          "Fifth Year"
        )
        .required(),
      yearEntry: Joi.number().integer().required(),
      yearGraduate: Joi.number().integer().allow(null),
    }).required(),

    academicHistory: Joi.object({
      elementarySchool: Joi.string().required(),
      elementaryAddress: Joi.string().required(),
      elementaryHonors: Joi.string().optional().allow(null),
      elementaryGraduate: Joi.date().optional().allow(null),

      secondarySchool: Joi.string().required(),
      secondaryAddress: Joi.string().required(),
      secondaryHonors: Joi.string().optional().allow(null),
      secondaryGraduate: Joi.date().optional().allow(null),

      seniorHighSchool: Joi.string().optional().allow(null),
      seniorHighAddress: Joi.string().optional().allow(null),
      seniorHighHonors: Joi.string().optional().allow(null),
      seniorHighSchoolGraduate: Joi.date().optional().allow(null),

      ncae_grade: Joi.string().optional().allow(null),
      ncae_year_taken: Joi.string().optional().allow(null),
      latest_college: Joi.string().optional().allow(null),
      college_address: Joi.string().optional().allow(null),
      college_honors: Joi.string().optional().allow(null),
      program: Joi.string().optional().allow(null),
    }).optional(),

    documents: Joi.object({
      form_167: Joi.boolean().required(),
      certificate_of_good_moral: Joi.boolean().required(),
      transcript_of_records: Joi.boolean().required(),
      nso_birth_certificate: Joi.boolean().required(),
      two_by_two_id_photo: Joi.boolean().required(),
      certificate_of_transfer_credential: Joi.boolean().required(),
    }).optional(),
  });

  validateRequest(req, next, schema);
}
