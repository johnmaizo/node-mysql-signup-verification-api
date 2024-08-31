const bcrypt = require("bcryptjs");
const Role = require("./role");

async function setupAccounts(db) {
  try {
    // SuperAdmin Setup
    const superAdminUser = await db.Account.findOne({
      where: {email: "admin@gmail.com"},
    });

    if (!superAdminUser) {
      const superAdminPasswordHash = await bcrypt.hash("admin123", 10);

      const newSuperAdmin = new db.Account({
        email: "admin@gmail.com",
        passwordHash: superAdminPasswordHash,
        role: Role.SuperAdmin,
        title: "Super Administrator",
        firstName: "Admin",
        lastName: "User",
        acceptTerms: true,
        verified: new Date(),
        created: new Date(),
      });

      await newSuperAdmin.save();
      console.log("SuperAdmin user created successfully.");
    } else {
      console.log("SuperAdmin user already exists.");
    }

    // Admin Setup
    const adminUser = await db.Account.findOne({
      where: {email: "admin2@gmail.com"},
    });

    if (!adminUser) {
      const adminPasswordHash = await bcrypt.hash("admin456", 10);

      const newAdmin = new db.Account({
        email: "admin2@gmail.com",
        passwordHash: adminPasswordHash,
        role: Role.Admin,
        title: "Administrator",
        firstName: "Admin",
        lastName: "User2",
        acceptTerms: true,
        verified: new Date(),
        created: new Date(),
      });

      await newAdmin.save();
      console.log("Admin user created successfully.");
    } else {
      console.log("Admin user already exists.");
    }

    // Staff Setup
    const staffUser = await db.Account.findOne({
      where: {email: "staff@gmail.com"},
    });

    if (!staffUser) {
      const staffPasswordHash = await bcrypt.hash("staff123", 10);

      const newStaff = new db.Account({
        email: "staff@gmail.com",
        passwordHash: staffPasswordHash,
        role: Role.Staff,
        title: "Staff Member",
        firstName: "Staff",
        lastName: "User",
        acceptTerms: true,
        verified: new Date(),
        created: new Date(),
      });

      await newStaff.save();
      console.log("Staff user created successfully.");
    } else {
      console.log("Staff user already exists.");
    }

    // Instructor Setup
    const instructorUser = await db.Account.findOne({
      where: {email: "instructor@gmail.com"},
    });

    if (!instructorUser) {
      const instructorPasswordHash = await bcrypt.hash("instructor123", 10);

      const newInstructor = new db.Account({
        email: "instructor@gmail.com",
        passwordHash: instructorPasswordHash,
        role: Role.Instructor,
        title: "Instructor",
        firstName: "Instructor",
        lastName: "User",
        acceptTerms: true,
        verified: new Date(),
        created: new Date(),
      });

      await newInstructor.save();
      console.log("Instructor user created successfully.");
    } else {
      console.log("Instructor user already exists.");
    }

    // Student Setup
    const studentUser = await db.Account.findOne({
      where: {email: "student@gmail.com"},
    });

    if (!studentUser) {
      const studentPasswordHash = await bcrypt.hash("student123", 10);

      const newStudent = new db.Account({
        email: "student@gmail.com",
        passwordHash: studentPasswordHash,
        role: Role.Student,
        title: "Student",
        firstName: "Student",
        lastName: "User",
        acceptTerms: true,
        verified: new Date(),
        created: new Date(),
      });

      await newStudent.save();
      console.log("Student user created successfully.");
    } else {
      console.log("Student user already exists.");
    }
  } catch (error) {
    console.error("Error setting up accounts:", error);
  }
}

module.exports = setupAccounts;
