const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const enrollmentService = require("./enrollment.service");

router.post(
  "/submit-application",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.MIS]), submitApplicationSchema,
  submitApplication
);
router.post(
  "/enroll-student",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.MIS]),
  enrollStudent
);
router.get(
  "/",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.MIS]),
  getAllStudentsOfficial
);
router.get(
  "/count",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.MIS]),
  getAllStudentOfficialCount
);
router.get("/get-chart-data", authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.MIS]), getChartData);
router.get("/fetch-applicant-data", authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.MIS]), fetchApplicantData);
router.get("/get-all-applicant", authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.MIS]), getAllApplicant);
router.get("/get-all-applicant-count", authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.MIS]), getAllApplicantCount);

router.get("/get-enrollment-status/:id", authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.MIS]), getEnrollmentStatusById);
router.get("/get-all-enrollment-status", getAllEnrollmentStatus);

router.get(
  "/:id",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.MIS]),
  getStudentById
);
router.put(
  "/enrollmentprocess", authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.MIS]),
  enrollmentProcessSchema,
  updateEnrollmentProcess
);
router.put(
  "/:id",
  authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.MIS]),
  updateStudentSchema,
  updateStudent
);

module.exports = router;

function submitApplication(req, res, next) {
  enrollmentService
  .submitApplication(req.body, req.user.id)
  .then(() =>
    res.json({
      message: "Application submitted successfully and enrollment process started",
    })
  )
  .catch((error) => {
    console.error("Error response:", error.message);

    // Send detailed error message to the client
    res.status(500).json({
      message: "Application submitted failed.",
      reason: error.message, // Detailed reason for the failure
    });
  });
}

function enrollStudent(req, res, next) {
  enrollmentService
    .enrollStudent(req.body, req.user.id)
    // .then((message) => res.json(message))
    // .catch((error) => next(error));

    .then(() =>
      res.json({
        message: "Student Enrolled Successfully!",
      })
    )
    .catch((error) => {
      console.error(
        "Error response:",
        error.response ? error.response.data : error.message
      );
      next(error);
    });
}

function getAllStudentsOfficial(req, res, next) {
  const {campusName} = req.query;
  enrollmentService
    .getAllStudentsOfficial(campusName)
    .then((students) => res.json(students))
    .catch(next);
}

function getAllStudentOfficialCount(req, res, next) {
  const {campusName} = req.query;

  enrollmentService
    .getAllStudentOfficialCount(campusName)
    .then((count) => res.json(count))
    .catch(next);
}

function getChartData(req, res, next) {
  const {campusName} = req.query;

  enrollmentService
    .getChartData(campusName)
    .then((count) => res.json(count))
    .catch(next);
}

async function fetchApplicantData(req, res, next) {
  const {campusName} = req.query;

  let isAborted = false;

  // Listen for 'aborted' event
  req.on("aborted", () => {
    isAborted = true;
  });

  try {
    const result = await enrollmentService.fetchApplicantData(
      campusName,
      isAborted
    );

    if (isAborted) {
      console.log("Request aborted, stopping processing.");
      return;
    }

    const message = result.isUpToDate
      ? "All applicants are up to date."
      : "Fetch Applicant Data Successfully! Updates or new entries have been made.";
    res.json({message});
  } catch (error) {
    if (!isAborted) {
      console.error(
        "Error response:",
        error.response ? error.response.data : error.message
      );
      next(error);
    } else {
      console.log("Error handling aborted process");
    }
  }
}

function getAllApplicant(req, res, next) {
  const {campus_id} = req.query;

  enrollmentService
    .getAllApplicant(campus_id)
    .then((applicants) => res.json(applicants))
    .catch(next);
}

function getAllApplicantCount(req, res, next) {
  const {campus_id} = req.query;

  enrollmentService
    .getAllApplicantCount(campus_id)
    .then((applicants) => res.json(applicants))
    .catch(next);
}

function getStudentById(req, res, next) {
  enrollmentService
    .getStudentById(req.params.id)
    .then((student) => (student ? res.json(student) : res.sendStatus(404)))
    .catch(next);
}

function updateEnrollmentProcess(req, res, next) {
  enrollmentService
    .updateEnrollmentProcess(req.body)
    .then((response) =>
      res.json({
        message: response.message,  // Use the message returned from the service
      })
    )
    .catch(next);
}


function getAllEnrollmentStatus(req, res, next) {
  const { campus_id, registrar_status, accounting_status, final_approval_status } = req.query;

  // Pass all filters to the service layer
  enrollmentService
    .getAllEnrollmentStatus(campus_id, registrar_status, accounting_status, final_approval_status)
    .then((data) => res.json(data))
    .catch(next);
}


function getEnrollmentStatusById(req, res, next) {
  enrollmentService
    .getEnrollmentStatusById(req.params.id)
    .then((student) => (student ? res.json(student) : res.sendStatus(404)))
    .catch(next);
}

// ! Schemas
function submitApplicationSchema(req, res, next) {
  const schema = Joi.object({
    personalData: Joi.object({

      enrollmentType: Joi.string().valid('online', 'on-site').required(),
      applicant_id_for_online: Joi.number().optional().allow(null),  // Nullable field
      campus_id: Joi.number().integer().required(),

      firstName: Joi.string().required(),
      middleName: [Joi.string().optional(), Joi.allow(null)],  // Allow null based on the model
      lastName: Joi.string().required(),
      suffix: Joi.string().optional().allow(null),  // Allow null based on the model
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
      ACR: Joi.string().optional().allow(null),  // Nullable field
    }).required(),

    addPersonalData: Joi.object({
      cityAddress: Joi.string().required(),  // Nullable field
      cityTelNumber: Joi.string().optional().allow(null),  // Nullable field
      provinceAddress: Joi.string().optional().allow(null),  // Nullable field
      provinceTelNumber: Joi.string().optional().allow(null),  // Nullable field
    }).optional(),

    familyDetails: Joi.object({
      fatherFirstName: Joi.string().optional().allow(null),  // Nullable field
      fatherMiddleName: Joi.string().optional().allow(null),  // Nullable field
      fatherLastName: Joi.string().optional().allow(null),  // Nullable field
      fatherAddress: Joi.string().optional().allow(null),  // Nullable field
      fatherOccupation: Joi.string().optional().allow(null),  // Nullable field
      fatherContactNumber: Joi.string().optional().allow(null),  // Nullable field
      fatherCompanyName: Joi.string().optional().allow(null),  // Nullable field
      fatherCompanyAddress: Joi.string().optional().allow(null),  // Nullable field
      fatherEmail: Joi.string().optional().allow(null),  // Nullable field
      fatherIncome: Joi.string().optional().allow(null),  // Nullable field

      motherFirstName: Joi.string().optional().allow(null),  // Nullable field
      motherMiddleName: Joi.string().optional().allow(null),  // Nullable field
      motherLastName: Joi.string().optional().allow(null),  // Nullable field
      motherAddress: Joi.string().optional().allow(null),  // Nullable field
      motherOccupation: Joi.string().optional().allow(null),  // Nullable field
      motherContactNumber: Joi.string().optional().allow(null),  // Nullable field
      motherCompanyName: Joi.string().optional().allow(null),  // Nullable field
      motherCompanyAddress: Joi.string().optional().allow(null),  // Nullable field
      motherEmail: Joi.string().optional().allow(null),  // Nullable field
      motherIncome: Joi.string().optional().allow(null),  // Nullable field

      guardianFirstName: Joi.string().optional().allow(null),  // Nullable field
      guardianMiddleName: Joi.string().optional().allow(null),  // Nullable field
      guardianLastName: Joi.string().optional().allow(null),  // Nullable field
      guardianRelation: Joi.string().optional().allow(null),  // Nullable field
      guardianContactNumber: Joi.string().optional().allow(null),  // Nullable field
    }).optional(),

    academicBackground: Joi.object({
      program_id: Joi.number().integer().required(),
      majorIn: Joi.string().optional().allow(null),  // Nullable field
      studentType: Joi.string().valid('Regular', 'Irregular').required(),  // Based on model
      applicationType: Joi.string().valid('Freshmen', 'Transferee', 'Cross Enrollee').required(),  // Based on model
      semester_id: Joi.number().integer().required(),
      yearLevel: Joi.string().valid('First Year', 'Second Year', 'Third Year', 'Fourth Year', 'Fifth Year').required(),
      yearEntry: Joi.number().integer().required(),
      yearGraduate: Joi.number().integer().required(),  // Nullable field
    }).required(),

    academicHistory: Joi.object({
      elementarySchool: Joi.string().required(),  // Nullable field
      elementaryAddress: Joi.string().required(),  // Nullable field
      elementaryHonors: Joi.string().optional().allow(null),  // Nullable field
      elementaryGraduate: Joi.date().optional().allow(null),  // Nullable field

      secondarySchool: Joi.string().required(),  // Nullable field
      secondaryAddress: Joi.string().required(),  // Nullable field
      secondaryHonors: Joi.string().optional().allow(null),  // Nullable field
      secondaryGraduate: Joi.date().optional().allow(null),  // Nullable field

      seniorHighSchool: Joi.string().optional().allow(null),  // Nullable field
      seniorHighAddress: Joi.string().optional().allow(null),  // Nullable field
      seniorHighHonors: Joi.string().optional().allow(null),  // Nullable field
      seniorHighSchoolGraduate: Joi.date().optional().allow(null),  // Nullable field
      
      ncae_grade: Joi.string().optional().allow(null),  // Nullable field
      ncae_year_taken: Joi.string().optional().allow(null),  // Nullable field
      latest_college: Joi.string().optional().allow(null),  // Nullable field
      college_address: Joi.string().optional().allow(null),  // Nullable field
      college_honors: Joi.string().optional().allow(null),  // Nullable field
      program: Joi.string().optional().allow(null),  // Nullable field
    }).optional(),

    documents: Joi.object({
      form_167: Joi.boolean().required(),  // Nullable field
      certificate_of_good_moral: Joi.boolean().required(),  // Nullable field
      transcript_of_records: Joi.boolean().required(),  // Nullable field
      nso_birth_certificate: Joi.boolean().required(),  // Nullable field
      two_by_two_id_photo: Joi.boolean().required(),  // Nullable field
      certificate_of_transfer_credential: Joi.boolean().required(),  // Nullable field
    }).optional(),
  });

  validateRequest(req, next, schema);
}

function updateStudentSchema(req, res, next) {
  const schema = Joi.object({
    firstName: Joi.string().empty(""),
    middleName: [Joi.string().optional(), Joi.allow(null)],
    lastName: Joi.string().empty(""),

    email: Joi.string().email().empty(""),
    contactNumber: Joi.string().empty(""),

    gender: Joi.string().empty(""),
    civilStatus: Joi.string().empty(""),
    birthDate: Joi.date().empty(""),
    birthPlace: Joi.string().empty(""),
    religion: Joi.string().empty(""),
    citizenship: Joi.string().empty(""),
    country: Joi.string().empty(""),
    ACR: [Joi.string().optional(), Joi.allow(null)],

    isActive: Joi.boolean().empty(""),

    isDeleted: Joi.boolean().empty(""),
  });
  validateRequest(req, next, schema);
}

function enrollmentProcessSchema(req, res, next) {
  const schema = Joi.object({
    student_personal_id: Joi.number().required(),
    allRoles: Joi.string().required(),
    specificRole: Joi.string().required(),
    status: Joi.string()
      .valid("accepted", "in-progress", "upcoming", "rejected", "final_approved")
      .required(),
    payment_confirmed: Joi.boolean().empty(""),
  });
  validateRequest(req, next, schema);
}

function updateStudent(req, res, next) {
  enrollmentService
    .updateStudent(req.params.id, req.body)
    .then(() =>
      res.json({
        message: "Student Updated Successfully.",
      })
    )
    .catch(next);
}
