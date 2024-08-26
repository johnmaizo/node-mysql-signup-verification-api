const {Op, literal, col} = require("sequelize");
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

// Common function to handle the transformation
function transformCourseData(course) {
  return {
    ...course,
    CourseCode: course.CourseCode || "Course code not found",
    CourseName: course.CourseName || "Course name not found",
    DepartmentCode: course.DepartmentCode || "Department code not found",
    Department: course.Department || "Department not found",
    Campus: course.Campus || "Campus not found",
  };
}

// Common function to get courses based on filter conditions
async function getCourses(whereClause) {
  const courses = await db.Course.findAll({
    where: whereClause,
    include: [
      {
        model: db.Department,
        include: [
          {
            model: db.Campus,
            attributes: [],
          },
        ],
        attributes: [],
      },
    ],
    attributes: {
      include: [
        [col("courseCode"), "CourseCode"],
        [col("courseName"), "CourseName"],
        [col("Department.departmentCode"), "DepartmentCode"],
        [col("Department.departmentName"), "Department"],
        [col("Department.Campus.campusName"), "Campus"],
      ],
    },
    raw: true, // Ensure result is flattened and returned as plain objects
  });

  return courses.map(transformCourseData);
}

async function getAllCourses() {
  return await getCourses({isDeleted: false});
}

async function getAllCoursesActive() {
  return await getCourses({isActive: true, isDeleted: false});
}

async function getAllCoursesDeleted() {
  return await getCourses({isDeleted: true});
}

async function getCourseById(id) {
  const course = await db.Course.findByPk(id, {
    include: [
      {
        model: db.Department,
        include: [
          {
            model: db.Campus,
            attributes: [],
          },
        ],
        attributes: [],
      },
    ],
    attributes: {
      include: [
        [col("courseCode"), "CourseCode"],
        [col("courseName"), "CourseName"],
        [col("Department.departmentCode"), "DepartmentCode"],
        [col("Department.departmentName"), "Department"],
        [col("Department.Campus.campusName"), "Campus"],
      ],
    },
    // Removed raw: true to ensure we get a Sequelize instance
  });

  if (!course) throw new Error("Course not found");

  return course; // Return the Sequelize instance
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
