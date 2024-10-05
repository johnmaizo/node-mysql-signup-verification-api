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
      const superAdminPasswordHash = await bcrypt.hash("gwapomaizo12345", 10);

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
      const adminPasswordHash = await bcrypt.hash("maizo12345", 10);

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
      const adminPasswordHash = await bcrypt.hash("maizo12345", 10);

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



    // MIS Employee Setup
    const misEmployee = await db.Employee.findOne({
      where: {role: Role.MIS, campus_id: 1},
    });

    // MIS Setup
    const misUser = await db.Account.findOne({
      where: {email: "mis@gmail.com"},
    });

    if (!misUser || !misEmployee) {
      const adminPasswordHash = await bcrypt.hash("aw12345", 10);

      const newMIS = new db.Account({
        employee_id: 4,

        email: "mis@gmail.com",
        passwordHash: adminPasswordHash,
        acceptTerms: true,
        verified: new Date(),
        created: new Date(),
      });

      await newMIS.save();
      console.log("MIS account created successfully.");
    } else {
      console.log("MIS account already exists.");
    }




    // Registrar Employee Setup
    const registrarEmployee = await db.Employee.findOne({
      where: {role: Role.Registrar, campus_id: 1},
    });

    // Registrar Setup
    const registrarUser = await db.Account.findOne({
      where: {email: "registrar@gmail.com"},
    });

    if (!registrarUser || !registrarEmployee) {
      const adminPasswordHash = await bcrypt.hash("aw12345", 10);

      const newRegistrar = new db.Account({
        employee_id: 5,

        email: "registrar@gmail.com",
        passwordHash: adminPasswordHash,
        acceptTerms: true,
        verified: new Date(),
        created: new Date(),
      });

      await newRegistrar.save();
      console.log("Registrar created successfully.");
    } else {
      console.log("Registrar already exists.");
    }



    // Data Center Employee Setup
    const dataCenterEmployee = await db.Employee.findOne({
      where: {role: Role.DataCenter, campus_id: 1},
    });

    // Data Center Setup
    const dataCenterUser = await db.Account.findOne({
      where: {email: "datacenter@gmail.com"},
    });

    if (!dataCenterUser || !dataCenterEmployee) {
      const adminPasswordHash = await bcrypt.hash("aw12345", 10);

      const newDataCenter = new db.Account({
        employee_id: 6,

        email: "datacenter@gmail.com",
        passwordHash: adminPasswordHash,
        acceptTerms: true,
        verified: new Date(),
        created: new Date(),
      });

      await newDataCenter.save();
      console.log("Data Center created successfully.");
    } else {
      console.log("Data Center already exists.");
    }




  } catch (error) {
    console.error("Error setting up accounts:", error);
  }
}

module.exports = setupAccounts;
