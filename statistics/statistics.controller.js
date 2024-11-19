const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const statisticsService = require("./statistics.service");

router.get("/total-enrollments", getTotalEnrollments);
router.get("/enrollments-by-department", getEnrollmentsByDepartment);
router.get("/enrollments-by-course", getEnrollmentsBySubject);
router.get("/enrollment-status-breakdown", getEnrollmentStatusBreakdown);
router.get("/gender-distribution", getGenderDistribution);
router.get("/enrollment-trends-by-semester", getEnrollmentTrendsBySemester);
router.get("/export-enrollments", exportEnrollments);

module.exports = router;

async function getTotalEnrollments(req, res, next) {
  try {
    const {campus_id, schoolYear, semester_id} = req.query;
    const totalEnrollments = await statisticsService.getTotalEnrollments(
      campus_id,
      schoolYear,
      semester_id
    );
    res.json({totalEnrollments});
  } catch (error) {
    next(error);
  }
}

async function getEnrollmentsByDepartment(req, res, next) {
  try {
    const {campus_id, schoolYear, semester_id} = req.query;
    const data = await statisticsService.getEnrollmentsByDepartment(
      campus_id,
      schoolYear,
      semester_id
    );
    res.json(data);
  } catch (error) {
    next(error);
  }
}

async function getEnrollmentsBySubject(req, res, next) {
  try {
    const {campus_id, schoolYear, semester_id} = req.query;
    const data = await statisticsService.getEnrollmentsBySubject(
      campus_id,
      schoolYear,
      semester_id
    );
    res.json(data);
  } catch (error) {
    next(error);
  }
}

async function getEnrollmentStatusBreakdown(req, res, next) {
  try {
    const {campus_id, schoolYear, semester_id} = req.query;
    const data = await statisticsService.getEnrollmentStatusBreakdown(
      campus_id,
      schoolYear,
      semester_id
    );
    res.json(data);
  } catch (error) {
    next(error);
  }
}

async function getGenderDistribution(req, res, next) {
  try {
    const {campus_id, schoolYear, semester_id} = req.query;
    const data = await statisticsService.getGenderDistribution(
      campus_id,
      schoolYear,
      semester_id
    );
    res.json(data);
  } catch (error) {
    next(error);
  }
}

async function getEnrollmentTrendsBySemester(req, res, next) {
  try {
    const {campus_id} = req.query;
    const data = await statisticsService.getEnrollmentTrendsBySemester(
      campus_id
    );
    res.json(data);
  } catch (error) {
    next(error);
  }
}

async function exportEnrollments(req, res, next) {
  try {
    const filters = req.query;
    const csvData = await statisticsService.exportEnrollments(filters);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="enrollments.csv"'
    );
    res.send(csvData);
  } catch (error) {
    next(error);
  }
}
