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

    // SuperAdmin Setup
    const superAdminUser = await db.Account.findOne({
      where: {email: "admin@gmail.com"},
    });

    if (!superAdminUser) {
      const superAdminPasswordHash = await bcrypt.hash("aw12345", 10);

      const newSuperAdmin = new db.Account({
        email: "admin@gmail.com",
        passwordHash: superAdminPasswordHash,
        role: Role.SuperAdmin,
        title: "Super Administrator",
        firstName: "John Robert",
        middleName: "Libaton",
        lastName: "Maizo",
        gender: "Male",
        address: "C.D. Seno St., Tipolo, Mandaue City",
        contactNumber: "09324568499",

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
      const adminPasswordHash = await bcrypt.hash("aw12345", 10);

      const newAdmin = new db.Account({
        email: "admin2@gmail.com",
        passwordHash: adminPasswordHash,
        role: `${Role.Admin}, ${Role.Instructor}, ${Role.Staff}, ${Role.Student}`,
        title: "Administrator",
        firstName: "John Robert",
        middleName: "Dope",
        lastName: "Gwapo",
        gender: "Male",
        address: "Banilad, Mandaue City",
        contactNumber: "09324568324",

        acceptTerms: true,
        verified: new Date(),
        created: new Date(),
        campus_id: 1, // Add a valid campus_id here
      });

      await newAdmin.save();
      console.log("Admin user created successfully.");
    } else {
      console.log("Admin user already exists.");
    }
    
    // Admin Setup - Cebu
    const adminUserCebu = await db.Account.findOne({
      where: {email: "cebu@gmail.com"},
    });

    if (!adminUserCebu) {
      const adminPasswordHash = await bcrypt.hash("aw12345", 10);

      const newAdmin = new db.Account({
        email: "cebu@gmail.com",
        passwordHash: adminPasswordHash,
        role: `${Role.Admin}, ${Role.Instructor}, ${Role.Student}`,
        title: "Mr",
        firstName: "Johnny",
        middleName: "gwapo",
        lastName: "Bravo",
        gender: "Male",
        address: "Benedicto St., Cebu City",
        contactNumber: "09324568546",


        acceptTerms: true,
        verified: new Date(),
        created: new Date(),
        campus_id: 2, // Add a valid campus_id here
      });

      await newAdmin.save();
      console.log("Admin user (CEBU) created successfully.");
    } else {
      console.log("Admin user (CEBU) already exists.");
    }

    // Staff Setup
    const registrarUser = await db.Account.findOne({
      where: {email: "registrar@gmail.com"},
    });

    if (!registrarUser) {
      const registrarPasswordHash = await bcrypt.hash("aw12345", 10);

      const newRegistrar = new db.Account({
        email: "registrar@gmail.com",
        passwordHash: registrarPasswordHash,
        role: `${Role.Instructor}, ${Role.Staff}, ${Role.Registrar}`,
        title: "Registrar Member",
        firstName: "Juan",
        middleName: "makabugto",
        lastName: "Tamad",
        gender: "Male",
        address: "Jmall, Mandaue City",
        contactNumber: "09554568324",
        
        acceptTerms: true,
        verified: new Date(),
        created: new Date(),
        campus_id: 1, // Add a valid campus_id here
      });

      await newRegistrar.save();
      console.log("Registrar user created successfully.");
    } else {
      console.log("Registrar user already exists.");
    }

  } catch (error) {
    console.error("Error setting up accounts:", error);
  }
}

module.exports = setupAccounts;
