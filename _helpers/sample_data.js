async function InsertSampleData(db) {
  try {
    // Check if data already exists in the database
    const existingCampuses = await db.Campus.findAll();
    if (existingCampuses.length > 0) {
      console.log("\n\n\n\nSample data already exists, skipping insertion.\n\n\n\n");
      return; // Exit the function if sample data is already present
    }
        
    // Insert sample campuses
    const campuses = await db.Campus.bulkCreate([
      { campusName: "Mandaue Campus", campusAddress: "AS Fortuna Street, Mandaue City 6014, Metro Cebu, Philippines" },
      { campusName: "Cebu Campus", campusAddress: "B. Benedicto St, Cebu City, 6000 Cebu, Philippines" }
    ], { returning: true }); // Returning allows us to use the created campus IDs for the next inserts

    // Insert sample semesters 
    const semesters = await db.Semester.bulkCreate([
      { campus_id: campuses[1].campus_id, semesterName: "1st Semester", schoolYear: "2024-2025", isActive: true },
      { campus_id: campuses[1].campus_id, semesterName: "2nd Semester", schoolYear: "2024-2025", isActive: false },
      { campus_id: campuses[1].campus_id, semesterName: "Summer", schoolYear: "2024-2025", isActive: false },
      { campus_id: campuses[0].campus_id, semesterName: "1st Semester", schoolYear: "2024-2025", isActive: true },
      { campus_id: campuses[0].campus_id, semesterName: "2nd Semester", schoolYear: "2024-2025", isActive: false },
      { campus_id: campuses[0].campus_id, semesterName: "Summer", schoolYear: "2024-2025", isActive: false }
    ]);

    // Insert sample departments
    const departments = await db.Department.bulkCreate([
      { campus_id: campuses[0].campus_id, departmentCode: "CCS", departmentName: "College of Computer Studies", departmentDean: "Prof. Gene Paul Cueva, MBA, MSIT" },
      { campus_id: campuses[0].campus_id, departmentCode: "CBM", departmentName: "College of Business and Management", departmentDean: "Dr. Jaypee Y. Zoilo, MBA" },
      { campus_id: campuses[1].campus_id, departmentCode: "CCS", departmentName: "College of Computer Studies", departmentDean: "test" },
      { campus_id: campuses[1].campus_id, departmentCode: "CBM", departmentName: "College of Business and Management", departmentDean: "test" },
      { campus_id: campuses[0].campus_id, departmentCode: "CEA", departmentName: "College of Education and Arts", departmentDean: "Dr. Johner D. Montegrande" },
      { campus_id: campuses[0].campus_id, departmentCode: "COE", departmentName: "College of Engineering", departmentDean: "Dr. Nimfa Ramirez" },
    ]);

    // Insert sample programs
    const programs = await db.Program.bulkCreate([
      {department_id: departments[0].department_id, programCode: "BSIT", programDescription: "Bachelor of Science in Information Technology"},
      {department_id: departments[2].department_id, programCode: "BSIT", programDescription: "Bachelor of Science in Information Technology"},
      {department_id: departments[1].department_id, programCode: "BSBA-HRM", programDescription: "Bachelor of Science in Business Administration major in Human Resource Management"},
      {department_id: departments[1].department_id, programCode: "BSBA-MM", programDescription: "Bachelor of Science in Business Administration major in Marketing Management"},
      {department_id: departments[1].department_id, programCode: "BSHM", programDescription: "Bachelor of Science in Hospitality Management"},
      {department_id: departments[1].department_id, programCode: "BSA", programDescription: "Bachelor of Science in Accountancy"},
      {department_id: departments[3].department_id, programCode: "BSBA-MM", programDescription: "Bachelor of Science in Business Administration major in Marketing Management"},
      {department_id: departments[3].department_id, programCode: "BSA", programDescription: "Bachelor of Science in Accountancy"},
      {department_id: departments[4].department_id, programCode: "BEED", programDescription: "Bachelor of Elementary Education major in General Content"},
      {department_id: departments[4].department_id, programCode: "BSED", programDescription: "Bachelor of Secondary Education major in English"},
      {department_id: departments[4].department_id, programCode: "BA-COMM", programDescription: "Bachelor of Arts in Communication"},
      {department_id: departments[5].department_id, programCode: "BSME", programDescription: "Bachelor of Science in Mechanical Engineering"},
      {department_id: departments[5].department_id, programCode: "BSCE", programDescription: "Bachelor of Science in Civil Engineering"},
      {department_id: departments[5].department_id, programCode: "BSEE", programDescription: "Bachelor of Science in Electrical Engineering"},
      {department_id: departments[5].department_id, programCode: "BSIE", programDescription: "Bachelor of Science in Industrial Engineering"},
    ])

    const courseinfos = await db.CourseInfo.bulkCreate([
      { campus_id: campuses[0].campus_id, courseCode: "RIZAL", courseDescription: "Rizal's Life & Works", unit: 3},
      { campus_id: campuses[1].campus_id, courseCode: "RIZAL", courseDescription: "Rizal's Life & Works", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "ARTHUM", courseDescription: "Arts & Humanities", unit: 3},
      { campus_id: campuses[1].campus_id, courseCode: "ARTHUM", courseDescription: "Arts & Humanities", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "FIL211", courseDescription: "Pagtuturo ng Filipino sa Elementarya 1 (Estruktura at Gamit ng Wikang Filipino)", unit: 3},
      { campus_id: campuses[1].campus_id, courseCode: "FIL211", courseDescription: "Pagtuturo ng Filipino sa Elementarya 1 (Estruktura at Gamit ng Wikang Filipino)", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "ENGL211", courseDescription: "Teaching English in the Elem. Grades (Language Arts)", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "LIT1", courseDescription: "Philippine Literature", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "PURCOM", courseDescription: "Purposive Communication", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "STS", courseDescription: "Science, Technology & Society", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "UTS", courseDescription: "Understanding the Self", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "NSTP1", courseDescription: "National Service Training Prog. 1", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "CW", courseDescription: "The Contemporary World", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "ECE111", courseDescription: "Basic Electronics - Lec", unit: 2},
      { campus_id: campuses[0].campus_id, courseCode: "ECE111L", courseDescription: "Basic Electronics - Lab", unit: 1},
      { campus_id: campuses[0].campus_id, courseCode: "EE201", courseDescription: "Basic Electrical Engineering - Lec", unit: 2},
      { campus_id: campuses[0].campus_id, courseCode: "EE201L", courseDescription: "Basic Electrical Engineering - Lab", unit: 1},
      { campus_id: campuses[0].campus_id, courseCode: "ES211", courseDescription: "Statics of Rigid Bodies", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "ES212", courseDescription: "Computer Fund. & Programming 1 - Lab", unit: 1},
      { campus_id: campuses[0].campus_id, courseCode: "ES213", courseDescription: "Environmental Science", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "MATH214", courseDescription: "Differential Equation", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "ME211", courseDescription: "Thermodynamics 1", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "PE3", courseDescription: "Physical Education 3", unit: 2},
      { campus_id: campuses[0].campus_id, courseCode: "CE411", courseDescription: "Principles of Steel Design - Lec", unit: 2},
      { campus_id: campuses[0].campus_id, courseCode: "CE411L", courseDescription: "Principles of Steel Design - Lab", unit: 1},
      { campus_id: campuses[0].campus_id, courseCode: "CE412", courseDescription: "Principles of Reinforced/Prestessesd Concrete - Lec", unit: 2},
      { campus_id: campuses[0].campus_id, courseCode: "CE412L", courseDescription: "Principles of Reinforced/Prestessesd Concrete - Lab", unit: 1},
      { campus_id: campuses[0].campus_id, courseCode: "CE413", courseDescription: "CE Project 1 - Lec", unit: 2},
      { campus_id: campuses[0].campus_id, courseCode: "CE413L", courseDescription: "CE Project 1 - Lab", unit: 1},
      { campus_id: campuses[0].campus_id, courseCode: "CE414", courseDescription: "Principles of Transportation Engineering", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "CE415", courseDescription: "Construction Methods & Project Management", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "CE416", courseDescription: "Refresher Course 2", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "ES411", courseDescription: "Engineering Management", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "PCS1", courseDescription: "Project Construction and Management", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "PCS2", courseDescription: "Construction Cost Engineering", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "CE400", courseDescription: "On-the-Job Training (240 Hours) - Lec", unit: 2},
      { campus_id: campuses[0].campus_id, courseCode: "CE400L", courseDescription: "On-the-Job Training (240 Hours) - Lab", unit: 1},
      { campus_id: campuses[0].campus_id, courseCode: "EE400", courseDescription: "On-the-Job Training (240 Hours)", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "IE400", courseDescription: "On-the-Job Training (240 Hours)", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "ME400", courseDescription: "On-the-Job Training (240 Hours)", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "FS1", courseDescription: "Field Study 1", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "FS2", courseDescription: "Field Study 2", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "RGEC2", courseDescription: "Review on Professional Education Courses", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "COM411", courseDescription: "Communication Planning", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "COM412", courseDescription: "Communication Management", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "THESIS1", courseDescription: "Social Project 1", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "EDUC311", courseDescription: "Assessment in Learning 1", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "EDUC312", courseDescription: "Technology for Teaching and Learning 1", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "EDUC313", courseDescription: "Facilitating Learner-Centered Teaching", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "LIT313", courseDescription: "Survey of Phil. Literature in English", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "LIT314", courseDescription: "Survey of Afro-Asian Literature", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "LIT315", courseDescription: "Survey of English & American Literature", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "LIT316", courseDescription: "Contemporary, Popular & Emergent Literature", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "SOCPHIL", courseDescription: "Social Science and Philosophy", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "COM111", courseDescription: "Intro. to Communication Media", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "COM210", courseDescription: "Development Communication", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "FIL3", courseDescription: "Masining na Pagpapahayag", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "MST", courseDescription: "Mathematics, Science & Technology", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "EL100", courseDescription: "Introduction to Linguistics", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "EL101", courseDescription: "Language, Culture & Society", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "EL102", courseDescription: "Structures of English", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "FIL1", courseDescription: "Wikang Filipino", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "HIST", courseDescription: "Readings in Philippine History", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "PURCOM", courseDescription: "Purposive Communication", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "CEL311", courseDescription: "Public Information Principles & Practices", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "COM311", courseDescription: "Communaction Theory", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "COM312", courseDescription: "Comm. Media Laws & Ethics", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "IPO310", courseDescription: "Public Relations Principles and Practices", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "PUBAD", courseDescription: "Public Administration", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "STAT", courseDescription: "Statistics & Probability", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "EDUC211", courseDescription: "The Teaching Profession", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "ELT214", courseDescription: "Teaching & Assessment of Lit.", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "ELT215", courseDescription: "Teaching & Assessment of the Macroskills", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "ELT216", courseDescription: "Teaching & Assessment of theGrammar", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "ELT217", courseDescription: "Speech & Theater Arts", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "ETHICS", courseDescription: "Ethics", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "MATHWORLD", courseDescription: "Mathematics in the Modern World", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "ARTS100", courseDescription: "Teaching Arts in the Elem.", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "EDUC311", courseDescription: "Assessment in Learning 1", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "EDUC312", courseDescription: "Technology for Teaching and Learning 1", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "EDUC313", courseDescription: "Facilitating Learner-Centered Teaching", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "MUSIC100", courseDescription: "Teaching Music in the Elementary Grades", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "RES100", courseDescription: "Research in Education", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "TLE311", courseDescription: "Edukasyong Pantahanan at Pangkabuhayan", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "EDUC211", courseDescription: "The Teaching Profession", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "MATH211", courseDescription: "Teaching Math in the Primary Grades", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "SCI211", courseDescription: "Teaching Science in Elementary Grades (Biology & Chemistry)", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "SSC211", courseDescription: "Teaching Social Studies in the Elementary Grades (Phil. History & Government)", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "VED100", courseDescription: "Good Manners and Right Conduct", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "FS", courseDescription: "Feasibility Study", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "HRDM12", courseDescription: "Special Topics in Human Management", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "IT410", courseDescription: "Capstone Project II - Lec", unit: 2},
      { campus_id: campuses[0].campus_id, courseCode: "IT410L", courseDescription: "Capstone Project II - Lab", unit: 1},
      { campus_id: campuses[0].campus_id, courseCode: "IT411", courseDescription: "Integrative Programming & Technologies - Lec", unit: 2},
      { campus_id: campuses[0].campus_id, courseCode: "IT411L", courseDescription: "Integrative Programming & Technologies - Lab", unit: 1},
      { campus_id: campuses[0].campus_id, courseCode: "IT412", courseDescription: "Systems Administration & Maintenance - Lec", unit: 2},
      { campus_id: campuses[0].campus_id, courseCode: "IT412L", courseDescription: "Systems Administration & Maintenance - Lab", unit: 1},
      { campus_id: campuses[0].campus_id, courseCode: "ITELECT", courseDescription: "IT Elective III - Lec", unit: 2},
      { campus_id: campuses[0].campus_id, courseCode: "ITELECTL", courseDescription: "IT Elective III - Lab", unit: 1},
      { campus_id: campuses[0].campus_id, courseCode: "IT323", courseDescription: "Capstone Project 1 - Lec", unit: 2},
      { campus_id: campuses[0].campus_id, courseCode: "IT323L", courseDescription: "Capstone Project 1 - Lab", unit: 1},
      { campus_id: campuses[0].campus_id, courseCode: "IT324", courseDescription: "Social Issues & Professional Practices", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "IT325", courseDescription: "Quantitative Methods", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "FILIT", courseDescription: "The Philippine Society in the IT Era", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "IT223", courseDescription: "Information Management", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "ITTEL1", courseDescription: "IT Track Elective 1 - Lec", unit: 2},
      { campus_id: campuses[0].campus_id, courseCode: "ITTEL1L", courseDescription: "IT Track Elective 1 - Lab", unit: 1},
      { campus_id: campuses[0].campus_id, courseCode: "FIL2", courseDescription: "Panitikan ng Pilipinas", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "IT120", courseDescription: "Discrete Structures", unit: 3},
      { campus_id: campuses[0].campus_id, courseCode: "IT121", courseDescription: "Computer Programming II (Lec)", unit: 2},
      { campus_id: campuses[0].campus_id, courseCode: "IT121L", courseDescription: "Computer Programming II (Lab)", unit: 1},
      { campus_id: campuses[0].campus_id, courseCode: "NSTP2", courseDescription: "National Service Traning Prog. 2", unit: 3},
    ])

    console.log("Sample data inserted successfully!");


  } catch (error) {
    console.error("Error setting up sample data:", error);
  }
}

module.exports = InsertSampleData;
