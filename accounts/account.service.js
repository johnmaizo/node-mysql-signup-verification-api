require("dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const {Op, where} = require("sequelize");
const sendEmail = require("_helpers/send-email");
const db = require("_helpers/db");
const Role = require("_helpers/role");

module.exports = {
  authenticate,
  refreshToken,
  revokeToken,
  register,
  verifyEmail,
  forgotPassword,
  validateResetToken,
  resetPassword,
  getAll,
  getById,
  create,
  update,
  delete: _delete,
};

async function authenticate({email, password, ipAddress}) {
  // Find the account without any associations first
  const account = await db.Account.scope("withHash").findOne({
    where: {email},
    include: [
      {
        model: db.Employee, // Include Employee model
        include: [
          {
            model: db.Campus, // Include Campus model if needed
            attributes: ["campusName", "campus_id"],
          },
        ],
      },
    ],
  });

  // Check if account exists and if passwordHash is present
  if (!account) {
    throw "Email or password is incorrect";
  }

  if (!account.passwordHash) {
    throw "Account password is not set. Please contact support.";
  }

  if (
    !account.isVerified ||
    !(await bcrypt.compare(password, account.passwordHash))
  ) {
    throw "Email or password is incorrect";
  }

  // Determine campus from the account
  const campus = account.employee ? account.employee.campus : null;

  // Generate JWT and refresh tokens
  const jwtToken = generateJwtToken(account);
  const refreshToken = generateRefreshToken(account, ipAddress);

  // Save refresh token
  await refreshToken.save();

  // Return basic details and tokens
  return {
    ...basicDetails(account, campus, account.employee),
    jwtToken,
    refreshToken: refreshToken.token,
  };
}

async function refreshToken({token, ipAddress}) {
  const refreshToken = await getRefreshToken(token);
  const account = await refreshToken.getAccount({
    include: [
      {
        model: db.Employee, // Include Employee model
        include: [
          {
            model: db.Campus, // Include Campus model
            attributes: ["campusName", "campus_id"], // Adjust attributes as needed
          },
        ],
      },
    ],
  });

  // Replace old refresh token with a new one and save
  const newRefreshToken = generateRefreshToken(account, ipAddress);
  refreshToken.revoked = Date.now();
  refreshToken.revokedByIp = ipAddress;
  refreshToken.replacedByToken = newRefreshToken.token;
  await refreshToken.save();
  await newRefreshToken.save();

  // Generate new JWT
  const jwtToken = generateJwtToken(account);

  // Return basic details and tokens
  return {
    ...basicDetails(account, account.employee.campus, account.employee),
    jwtToken,
    refreshToken: newRefreshToken.token,
  };
}

async function revokeToken({token, ipAddress}) {
  const refreshToken = await getRefreshToken(token);

  // revoke token and save
  refreshToken.revoked = Date.now();
  refreshToken.revokedByIp = ipAddress;
  await refreshToken.save();
}

async function register(params, origin) {
  // validate
  if (await db.Account.findOne({where: {email: params.email}})) {
    // send already registered error in email to prevent account enumeration
    return await sendAlreadyRegisteredEmail(params.email, origin);
  }

  // create account object
  const account = new db.Account(params);

  // first registered account is an admin
  const isFirstAccount = (await db.Account.count()) === 0;
  account.role = isFirstAccount ? Role.Admin : Role.User;
  account.verificationToken = randomTokenString();

  // hash password
  account.passwordHash = await hash(params.password);

  // save account
  await account.save();

  // send email
  await sendVerificationEmail(account, origin);
}

async function verifyEmail({token}) {
  const account = await db.Account.findOne({where: {verificationToken: token}});

  if (!account) throw "Verification failed";

  account.verified = Date.now();
  account.verificationToken = null;
  await account.save();
}

async function forgotPassword({email}, origin) {
  const account = await db.Account.findOne({where: {email}});

  // always return ok response to prevent email enumeration
  if (!account) return;

  // create reset token that expires after 24 hours
  account.resetToken = randomTokenString();
  account.resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await account.save();

  // send email
  await sendPasswordResetEmail(account, origin);
}

async function validateResetToken({token}) {
  const account = await db.Account.findOne({
    where: {
      resetToken: token,
      resetTokenExpires: {[Op.gt]: Date.now()},
    },
  });

  if (!account) throw "Invalid token";

  return account;
}

async function resetPassword({token, password}) {
  const account = await validateResetToken({token});

  // update password and remove reset token
  account.passwordHash = await hash(password);
  account.passwordReset = Date.now();
  account.resetToken = null;
  await account.save();
}

async function getAll(campus_id = null) {
  const accounts = await db.Account.findAll({
    include: [
      {
        model: db.Employee, // Include Employee model
        where: campus_id ? {campus_id: campus_id} : undefined,
        include: [
          {
            model: db.Campus, // Move Campus inside Employee
            attributes: ["campusName", "campus_id"],
          },
        ],
      },
    ],
    order: [["id", "ASC"]], // Sort by id in ascending order
  });
  return accounts.map((x) => basicDetails(x, x.employee.campus, x.employee));
}

async function getById(id) {
  const account = await db.Account.findByPk(id, {
    include: [
      {
        model: db.Employee, // Include Employee model
        include: [
          {
            model: db.Campus, // Move Campus inside Employee
            attributes: ["campusName", "campus_id"],
          },
        ],
      },
    ],
  });
  return basicDetails(account, account.employee.campus, account.employee);
}

/**
 * Creates a new account based on the provided parameters.
 * @param {Object} params - An object containing the required parameters.
 * @param {number} params.employee_id - The ID of the employee to create an account for.
 * @param {string} [params.email] - The email address to associate with the account.
 * @param {string} [params.password] - The password to associate with the account (required for allowed roles only).
 * @param {number} accountId - The ID of the account performing the action.
 * @returns {Promise<Account>} The newly created account with basic details.
 * @throws {Error} If the employee ID is not provided, if the employee is already registered, or if there is an error with the API requests.
 */
async function create(params, accountId) {
  // Ensure employee_id is provided
  if (!params.employee_id) {
    throw new Error("Employee ID is required.");
  }

  // Retrieve the employee to check the role and campus_id
  const employee = await db.Employee.findByPk(params.employee_id);
  if (!employee) {
    throw new Error("Employee not found.");
  }

  const roleArray = employee.role.split(", "); // Assuming role is a comma-separated string

  // Validate if employee is already registered
  const existingEmployee = await db.Account.findOne({
    where: {employee_id: params.employee_id},
    include: [
      {
        model: db.Employee,
      },
    ],
  });
  if (existingEmployee) {
    throw `Employee "${existingEmployee.employee.firstName} ${existingEmployee.employee.lastName}" already has an account.`;
  }

  // Validate if email is already registered
  const existingEmail = await db.Account.findOne({
    where: {email: params.email},
  });
  if (existingEmail) {
    throw `Email "${params.email}" is already registered.`;
  }

  const allowedRoles = [
    Role.SuperAdmin,
    Role.Admin,
    Role.Registrar,
    Role.DataCenter,
    Role.Dean,
    Role.Accounting,
  ];

  // Check if password is provided but role is not in allowedRoles
  if (
    params.password &&
    !roleArray.some((role) => allowedRoles.includes(role))
  ) {
    throw new Error(
      "You cannot create an account with a password unless you are in an allowed role."
    );
  }

  const account = new db.Account(params);
  account.verified = Date.now();

  // Set passwordHash based on the employee's role
  if (roleArray.some((role) => allowedRoles.includes(role))) {
    account.passwordHash = await hash(params.password);
  } else {
    account.passwordHash = null; // No password for other roles
  }

  // Save account
  await account.save();

  // Log the creation action
  await db.History.create({
    action: "create",
    entity: "Accounts",
    entityId: account.id,
    changes: params,
    accountId: accountId,
  });

  // Retrieve campus info from the employee record
  const campus = employee.campus_id
    ? await db.Campus.findByPk(employee.campus_id, {
        attributes: ["campusName", "campus_id"],
      })
    : null;

  return basicDetails(account, campus, employee);
}

async function update(id, params) {
  const account = await getAccount(id);

  // Ensure employee_id is provided
  if (!params.employee_id) {
    throw new Error("Employee ID is required.");
  }

  // Retrieve the employee to check the role and campus_id
  const employee = await db.Employee.findByPk(params.employee_id);
  if (!employee) {
    throw new Error("Employee not found.");
  }

  // Validate if email was changed
  if (
    params.email &&
    account.email !== params.email &&
    (await db.Account.findOne({where: {email: params.email}}))
  ) {
    throw `Email "${params.email}" is already taken.`;
  }

  // Hash password if it was entered
  if (params.password) {
    params.passwordHash = await hash(params.password);
  }

  // Copy params to account and save
  Object.assign(account, params);
  account.updated = Date.now();
  await account.save();

  // Retrieve campus info from the employee record
  const campus = employee.campus_id
    ? await db.Campus.findByPk(employee.campus_id, {
        attributes: ["campusName", "campus_id"],
      })
    : null;

  return basicDetails(account, campus, employee);
}

async function _delete(id) {
  const account = await getAccount(id);
  await account.destroy();
}

// helper functions

async function getAccount(id) {
  const account = await db.Account.findByPk(id);
  if (!account) throw "Account not found";
  return account;
}

async function getRefreshToken(token) {
  const refreshToken = await db.RefreshToken.findOne({where: {token}});
  if (!refreshToken || !refreshToken.isActive) throw "Invalid token";
  return refreshToken;
}

async function hash(password) {
  return await bcrypt.hash(password, 10);
}

function generateJwtToken(account) {
  // create a jwt token containing the account id
  return jwt.sign({sub: account.id, id: account.id}, process.env.SECRET, {
    // expiresIn: "5m",
    expiresIn: "30m",
  });
}

function generateRefreshToken(account, ipAddress) {
  // create a refresh token that expires in 7 days
  return new db.RefreshToken({
    accountId: account.id,
    token: randomTokenString(),
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdByIp: ipAddress,
  });
}

function randomTokenString() {
  return crypto.randomBytes(40).toString("hex");
}

function basicDetails(account, campus, employee) {
  const {id, email, created, updated, isVerified} = account;

  const {title, firstName, middleName, lastName, contactNumber, role} =
    employee;

  let roles = employee.role
    ? employee.role.split(",").map((r) => r.trim())
    : [];

  const validRoles = [
    Role.SuperAdmin,
    Role.Admin,
    Role.Registrar,
    Role.DataCenter,
    Role.Dean,
    Role.Accounting,
  ];

  // Filter roles to keep only valid ones
  const forValidRoles = roles.filter((role) => validRoles.includes(role));

  // Get the first valid role if available
  const firstValidRole = roles.length > 0 ? roles[0] : null;

  // Handle qualifications, parse the string into an array if needed
  let qualificationsArray = [];
  if (typeof employee.qualifications === "string") {
    try {
      qualificationsArray = JSON.parse(employee.qualifications);
    } catch (error) {
      console.error("Error parsing qualifications:", error);
      qualificationsArray = []; // Handle the error by returning an empty array
    }
  } else if (Array.isArray(employee.qualifications)) {
    qualificationsArray = employee.qualifications;
  }

  // Check if qualifications exist and map the abbreviations
  const qualifications =
    qualificationsArray.length > 0
      ? `, (${qualificationsArray.map((q) => q.abbreviation).join(", ")})`
      : "";

  return {
    id,
    title,
    firstName,
    middleName,
    lastName,
    email,
    contactNumber,
    role,
    created: created ? created.toISOString() : null,
    updated: updated ? updated.toISOString() : null,
    isVerified,
    allRoles: employee.role || null,
    fullName:
      `${employee.title} ${employee.firstName}${
        employee.middleName != null ? ` ${`${employee.middleName[0]}.`}` : ""
      } ${employee.lastName}${qualifications}` || null,
    fullNameWithRole:
      `${employee.title} ${employee.firstName}${
        employee.middleName != null ? ` ${`${employee.middleName[0]}.`}` : ""
      } ${employee.lastName}${qualifications} - ${
        firstValidRole ? firstValidRole : forValidRoles
      }` || null,

    // Include campusName if the role is not SuperAdmin
    ...(role !== "SuperAdmin" && campus
      ? {campusName: campus.campusName, campus_id: campus.campus_id}
      : {}),
  };
}

async function sendVerificationEmail(account, origin) {
  let message;
  if (origin) {
    const verifyUrl = `${origin}/account/verify-email?token=${account.verificationToken}`;
    message = `<p>Please click the below link to verify your email address:</p>
                   <p><a href="${verifyUrl}">${verifyUrl}</a></p>`;
  } else {
    message = `<p>Please use the below token to verify your email address with the <code>/account/verify-email</code> api route:</p>
                   <p><code>${account.verificationToken}</code></p>`;
  }

  await sendEmail({
    to: account.email,
    subject: "Sign-up Verification API - Verify Email",
    html: `<h4>Verify Email</h4>
               <p>Thanks for registering!</p>
               ${message}`,
  });
}

async function sendAlreadyRegisteredEmail(email, origin) {
  let message;
  if (origin) {
    message = `<p>If you don't know your password please visit the <a href="${origin}/account/forgot-password">forgot password</a> page.</p>`;
  } else {
    message = `<p>If you don't know your password you can reset it via the <code>/account/forgot-password</code> api route.</p>`;
  }

  await sendEmail({
    to: email,
    subject: "Sign-up Verification API - Email Already Registered",
    html: `<h4>Email Already Registered</h4>
               <p>Your email <strong>${email}</strong> is already registered.</p>
               ${message}`,
  });
}

async function sendPasswordResetEmail(account, origin) {
  let message;
  if (origin) {
    const resetUrl = `${origin}/account/reset-password?token=${account.resetToken}`;
    message = `<p>Please click the below link to reset your password, the link will be valid for 1 day:</p>
                   <p><a href="${resetUrl}">${resetUrl}</a></p>`;
  } else {
    message = `<p>Please use the below token to reset your password with the <code>/account/reset-password</code> api route:</p>
                   <p><code>${account.resetToken}</code></p>`;
  }

  await sendEmail({
    to: account.email,
    subject: "Sign-up Verification API - Reset Password",
    html: `<h4>Reset Password Email</h4>
               ${message}`,
  });
}
