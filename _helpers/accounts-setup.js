const bcrypt = require("bcryptjs");
const Role = require("./role");

async function setupAccounts(db) {
  try {
    // Ensure there's at least one campus in the database
    let defaultCampus = await db.Campus.findOne();
    if (!defaultCampus) {
      defaultCampus = await db.Campus.create({
        campusName: "Mandaue Campus",
        campusAddress:
          "AS Fortuna Street, Mandaue City 6014, Metro Cebu, Philippines",
      });
      console.log("Default campus created successfully.");
    }

    // SuperAdmin Employee Setup
    const superAdminEmployee = await db.Employee.findOne({
      where: {role: Role.SuperAdmin},
    });

    // SuperAdmin Setup
    const superAdminUser = await db.Account.findOne({
      where: {email: "superadmin@gmail.com"},
    });

    if (!superAdminUser || !superAdminEmployee) {
      const superAdminPasswordHash = await bcrypt.hash("aw12345", 10);

      const newEmployeeSuperAdmin = new db.Employee({
        role: Role.SuperAdmin,
        title: "Super Duper Admin",
        firstName: "John Robert",
        middleName: "Libaton",
        lastName: "Maizo",
        gender: "Male",
        address: "C.D. Seno St., Tipolo, Mandaue City",
        contactNumber: "09321146580",
      });

      await newEmployeeSuperAdmin.save();

      const newSuperAdmin = new db.Account({
        employee_id: 1,
        email: "superadmin@gmail.com",
        passwordHash: superAdminPasswordHash,

        acceptTerms: true,
        verified: new Date(),
        created: new Date(),
      });

      await newSuperAdmin.save();
      console.log("SuperAdmin user created successfully.");
    } else {
      console.log("SuperAdmin user already exists.");
    }

    // Admin Employee Setup
    const adminEmployee = await db.Employee.findOne({
      where: {role: Role.Admin, campus_id: 1},
    });

    // Admin Setup
    const adminUser = await db.Account.findOne({
      where: {email: "admin2@gmail.com"},
    });

    if (!adminUser || !adminEmployee) {
      const adminPasswordHash = await bcrypt.hash("aw12345", 10);

      const newEmployeeAdmin = new db.Employee({
        role: Role.Admin,
        title: "Administrator",
        firstName: "John Robert",
        middleName: "Dope",
        lastName: "Gwapo",
        gender: "Male",
        address: "Banilad, Mandaue City",
        contactNumber: "09324568324",

        campus_id: 1, // Add a valid campus_id here
      });

      await newEmployeeAdmin.save();

      const newAdmin = new db.Account({
        employee_id: 2,

        email: "admin2@gmail.com",
        passwordHash: adminPasswordHash,
        acceptTerms: true,
        verified: new Date(),
        created: new Date(),
      });

      await newAdmin.save();
      console.log("Admin user created successfully.");
    } else {
      console.log("Admin user already exists.");
    }

    // Cebu Admin Employee Setup
    const adminCebuEmployee = await db.Employee.findOne({
      where: {role: Role.Admin, campus_id: 2},
    });

    // Admin Setup - Cebu
    const adminUserCebu = await db.Account.findOne({
      where: {email: "cebu@gmail.com"},
    });

    if (!adminUserCebu || !adminCebuEmployee) {
      const adminPasswordHash = await bcrypt.hash("aw12345", 10);

      const newEmployeeCebuAdmin = new db.Employee({
        role: Role.Admin,
        title: "Administrator",
        firstName: "Juan",
        middleName: "Cingko",
        lastName: "Makabugto",
        gender: "Male",
        address: "Banilad, Mandaue City",
        contactNumber: "09485324123",

        campus_id: 2, // Add a valid campus_id here
      });

      await newEmployeeCebuAdmin.save();

      const newAdmin = new db.Account({
        employee_id: 3,

        email: "cebu@gmail.com",
        passwordHash: adminPasswordHash,
        acceptTerms: true,
        verified: new Date(),
        created: new Date(),
      });

      await newAdmin.save();
      console.log("Admin user (CEBU) created successfully.");
    } else {
      console.log("Admin user (CEBU) already exists.");
    }
  } catch (error) {
    console.error("Error setting up accounts:", error);
  }
}

module.exports = setupAccounts;
