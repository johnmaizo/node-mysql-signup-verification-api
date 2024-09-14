const config = require("config.json");
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
  const account = await db.Account.scope("withHash").findOne({where: {email}});

  if (
    !account ||
    !account.isVerified ||
    !(await bcrypt.compare(password, account.passwordHash))
  ) {
    throw "Email or password is incorrect";
  }

  // If the account is not SuperAdmin, fetch the campus information
  let campus = null;
  if (account.role !== "SuperAdmin") {
    campus = await account.getCampus({
      attributes: ["campusName", "campus_id"],
    });
  }

  // Generate jwt and refresh tokens
  const jwtToken = generateJwtToken(account);
  const refreshToken = generateRefreshToken(account, ipAddress);

  // Save refresh token
  await refreshToken.save();

  // Return basic details and tokens
  return {
    ...basicDetails(account, campus),
    jwtToken,
    refreshToken: refreshToken.token,
  };
}

async function refreshToken({token, ipAddress}) {
  const refreshToken = await getRefreshToken(token);
  const account = await refreshToken.getAccount();

  // replace old refresh token with a new one and save
  const newRefreshToken = generateRefreshToken(account, ipAddress);
  refreshToken.revoked = Date.now();
  refreshToken.revokedByIp = ipAddress;
  refreshToken.replacedByToken = newRefreshToken.token;
  await refreshToken.save();
  await newRefreshToken.save();

  // generate new jwt
  const jwtToken = generateJwtToken(account);

  // return basic details and tokens
  return {
    ...basicDetails(account),
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
    where: campus_id ? {campus_id: campus_id} : undefined,
    include: [
      {
        model: db.Campus,
        attributes: ["campusName", "campus_id"],
      },
    ],
  });
  return accounts.map((x) => basicDetails(x, x.campus));
}

async function getById(id) {
  const account = await db.Account.findByPk(id, {
    include: [
      {
        model: db.Campus,
        attributes: ["campusName", "campus_id"],
      },
    ],
  });
  return basicDetails(account, account.campus);
}

async function create(params, accountId) {
  // Ensure role is an array and check if it contains "Admin", "SuperAdmin", or "Registrar"
  const allowedRoles = [Role.SuperAdmin, Role.Admin, Role.Registrar];

  // Convert role to an array if it is not already
  const roleArray = Array.isArray(params.role) ? params.role : [params.role];

  // Check if any of the allowed roles are present in the role array
  const hasAllowedRole = roleArray.some((role) => allowedRoles.includes(role));

  if (!hasAllowedRole) {
    throw `Cannot create an account for the role "${params.role}"`;
  }

  // Validate if email is already registered
  if (await db.Account.findOne({where: {email: params.email}})) {
    throw `Email "${params.email}" is already registered`;
  }

  // Convert the role array to a comma-separated string if it's an array
  params.role = roleArray.join(", ");

  const account = new db.Account(params);
  account.verified = Date.now();

  // Hash password
  account.passwordHash = await hash(params.password);

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

  // Retrieve the campus info if the role is not SuperAdmin
  const campus = !roleArray.includes("SuperAdmin")
    ? await account.getCampus({attributes: ["campusName", "campus_id"]})
    : null;

  return basicDetails(account, campus);
}

async function update(id, params) {
  const account = await getAccount(id);

  // Validate if email was changed
  if (
    params.email &&
    account.email !== params.email &&
    (await db.Account.findOne({where: {email: params.email}}))
  ) {
    throw `Email "${params.email}" is already taken`;
  }

  // Hash password if it was entered
  if (params.password) {
    params.passwordHash = await hash(params.password);
  }

  // Copy params to account and save
  Object.assign(account, params);
  account.updated = Date.now();
  await account.save();

  // Retrieve the campus info if the role is not SuperAdmin
  const campus =
    account.role !== "SuperAdmin"
      ? await account.getCampus({attributes: ["campusName", "campus_id"]})
      : null;

  return basicDetails(account, campus);
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
  return jwt.sign({sub: account.id, id: account.id}, config.secret, {
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

function basicDetails(account, campus) {
  const {
    id,
    title,
    firstName,
    lastName,
    email,
    role,
    created,
    updated,
    isVerified,
  } = account;

  return {
    id,
    title,
    firstName,
    lastName,
    email,
    role,
    created: created ? created.toISOString() : null,
    updated: updated ? updated.toISOString() : null,
    isVerified,
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
