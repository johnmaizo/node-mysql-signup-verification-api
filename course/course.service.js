const {Op, literal} = require("sequelize");
const db = require("_helpers/db");

module.exports = {
  createCourse,
  getAllCourses,
  getAllCoursesActive,
  getAllCoursesDeleted,
  getCourseById,
  updateCourse,
};

async function createCourse(params) {
  let department;

  // Fetch departmentName if department_id is provided
  if (params.department_id) {
    department = await db.Department.findByPk(params.department_id);
    if (!department) {
      throw `Department with ID "${params.department_id}" not found.`;
    }
    params.departmentName = `${department.departmentName} - ${department.campusName}`;
  } else if (params.departmentName) {
    // Split departmentName and campusName from params.departmentName
    let [departmentName, campusName] = params.departmentName.split(" - ");
    departmentName = departmentName.trim();
    campusName = campusName.trim();

    // Fetch department_id based on the split departmentName and campusName
    department = await db.Department.findOne({
      where: {
        departmentName: departmentName,
        campusName: campusName,
      },
    });

    if (!department) {
      throw `Department with name "${departmentName}" not found on the campus "${campusName}".`;
    }

    params.department_id = department.department_id;
  } else {
    throw "Either department_id or departmentName must be provided.";
  }

  // Validate if courseCode or courseName exists in the same campus
  const existingCourse = await db.Course.findOne({
    where: {
      [Op.or]: [
        {courseCode: params.courseCode},
        {courseName: params.courseName},
      ],
      department_id: {
        [Op.in]: literal(`(
          SELECT department_id FROM departments WHERE campusName = '${department.campusName}'
        )`),
      },
    },
  });

  if (existingCourse) {
    throw `Either Course Code "${params.courseCode}" or Course Name "${params.courseName}" is already registered on the campus "${department.campusName}".`;
  }

  const course = new db.Course(params);

  // Save course
  await course.save();
}

async function getAllCourses() {
  const courses = await db.Course.findAll({
    where: {
      isDeleted: false,
    },
  });
  return courses;
}

async function getAllCoursesActive() {
  const courses = await db.Course.findAll({
    where: {
      isActive: true,
      isDeleted: false,
    },
  });
  return courses;
}

async function getAllCoursesDeleted() {
  const courses = await db.Course.findAll({
    where: {
      isDeleted: true,
    },
  });
  return courses;
}

async function getCourseById(id) {
  const course = await db.Course.findByPk(id);
  if (!course) throw "Course not found";
  return course;
}

async function updateCourse(id, params) {
  const course = await getCourseById(id);
  if (!course) throw "Course not found";

  // Check if the action is only to delete the course
  if (params.isDeleted !== undefined) {
    // Validation: Ensure isActive is set to false before deleting
    if (params.isDeleted && course.isActive) {
      throw `You must set the Status of "${course.courseName}" to Inactive before you can delete this course.`;
    }

    // Proceed with deletion or reactivation
    Object.assign(course, {isDeleted: params.isDeleted});
    await course.save();
    return;
  }

  let department;

  // Fetch departmentName if department_id is provided
  if (params.department_id) {
    department = await db.Department.findByPk(params.department_id);
    if (!department) {
      throw `Department with ID "${params.department_id}" not found.`;
    }
    params.departmentName = `${department.departmentName} - ${department.campusName}`;
  } else if (params.departmentName) {
    // Split departmentName and campusName from params.departmentName
    let [departmentName, campusName] = params.departmentName.split(" - ");
    departmentName = departmentName.trim();
    campusName = campusName.trim();

    // Fetch department_id based on the split departmentName and campusName
    department = await db.Department.findOne({
      where: {
        departmentName: departmentName,
        campusName: campusName,
      },
    });

    if (!department) {
      throw `Department with name "${departmentName}" not found on the campus "${campusName}".`;
    }

    params.department_id = department.department_id;
  } else {
    params.department_id = course.department_id;
    params.departmentName = course.departmentName;
  }

  // Validate if courseCode or courseName exists in the same campus for another course
  const existingCourse = await db.Course.findOne({
    where: {
      [Op.or]: [
        {courseCode: params.courseCode || course.courseCode},
        {courseName: params.courseName || course.courseName},
      ],
      department_id: {
        [Op.in]: literal(`(
          SELECT department_id FROM departments WHERE campusName = '${department.campusName}'
        )`),
      },
      course_id: {[Op.ne]: id}, // Ensure the course being updated is excluded from this check
    },
  });

  if (existingCourse) {
    throw `Either Course Code "${
      params.courseCode || course.courseCode
    }" or Course Name "${
      params.courseName || course.courseName
    }" is already registered on the campus "${department.campusName}".`;
  }

  // Update course with new params
  Object.assign(course, params);
  await course.save();
}
