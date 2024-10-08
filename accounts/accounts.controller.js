﻿const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('_middleware/validate-request');
const authorize = require('_middleware/authorize')
const Role = require('_helpers/role');
const accountService = require('./account.service');

// routes
router.get('/', authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.DataCenter, Role.MIS]), getAll);
// Add new route
router.get('/me', authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.DataCenter, Role.MIS]), getMe);
router.post('/authenticate', authenticateSchema, authenticate);
router.post('/refresh-token', refreshToken);
router.post('/revoke-token', authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.DataCenter, Role.MIS]), revokeTokenSchema, revokeToken);
router.post('/register', authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.DataCenter, Role.MIS]), registerSchema, register);
router.post('/verify-email', verifyEmailSchema, verifyEmail);
router.post('/forgot-password', forgotPasswordSchema, forgotPassword);
router.post('/validate-reset-token', validateResetTokenSchema, validateResetToken);
router.post('/reset-password', resetPasswordSchema, resetPassword);

router.get('/:id', authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.DataCenter, Role.MIS]), getById);
router.post('/', authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.DataCenter, Role.MIS]), createSchema, create);
router.put('/:id', authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.DataCenter, Role.MIS]), updateSchema, update);
router.delete('/:id', authorize([Role.SuperAdmin, Role.Admin, Role.Registrar, Role.DataCenter, Role.MIS]), _delete);



module.exports = router;

// Controller function for '/me' endpoint
async function getMe(req, res, next) {
    try {
        const account = await accountService.getById(req.user.id);
        if (!account) return res.status(404).json({ message: 'Account not found' });
        res.json(account);
    } catch (error) {
        next(error);
    }
}

function authenticateSchema(req, res, next) {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    });
    validateRequest(req, next, schema);
}

function authenticate(req, res, next) {
    const { email, password } = req.body;
    const ipAddress = req.ip;
    accountService.authenticate({ email, password, ipAddress })
        .then(({ refreshToken, ...account }) => {
            setTokenCookie(res, refreshToken);
            res.json(account);
        })
        .catch(next);
}

function refreshToken(req, res, next) {
    const token = req.cookies.refreshToken;
    const ipAddress = req.ip;

    if (!token) {
        console.error('No refresh token cookie found');
        return res.status(400).json({ message: 'No refresh token provided' });
    }

    accountService.refreshToken({ token, ipAddress })
        .then(({ refreshToken, ...account }) => {
            setTokenCookie(res, refreshToken);
            res.json(account);
        })
        .catch(next);
}

function revokeTokenSchema(req, res, next) {
    const schema = Joi.object({
        token: Joi.string().empty('')
    });
    validateRequest(req, next, schema);
}

function revokeToken(req, res, next) {
    // accept token from request body or cookie
    const token = req.body.token || req.cookies.refreshToken;
    const ipAddress = req.ip;

    if (!token) return res.status(400).json({ message: 'Token is required' });

    // users can revoke their own tokens and admins can revoke any tokens
    if (!req.user.ownsToken(token) && req.user.role !== Role.Admin) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    accountService.revokeToken({ token, ipAddress })
        .then(() => res.json({ message: 'Token revoked' }))
        .catch(next);
}

function registerSchema(req, res, next) {
    const schema = Joi.object({
        title: Joi.string().required(),
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
        acceptTerms: Joi.boolean().valid(true).required()
    });
    validateRequest(req, next, schema);
}

function register(req, res, next) {
    accountService.register(req.body, req.get('origin'))
        .then(() => res.json({ message: 'Registration successful, please check your email for verification instructions' }))
        .catch(next);
}

function verifyEmailSchema(req, res, next) {
    const schema = Joi.object({
        token: Joi.string().required()
    });
    validateRequest(req, next, schema);
}

function verifyEmail(req, res, next) {
    accountService.verifyEmail(req.body)
        .then(() => res.json({ message: 'Verification successful, you can now login' }))
        .catch(next);
}

function forgotPasswordSchema(req, res, next) {
    const schema = Joi.object({
        email: Joi.string().email().required()
    });
    validateRequest(req, next, schema);
}

function forgotPassword(req, res, next) {
    accountService.forgotPassword(req.body, req.get('origin'))
        .then(() => res.json({ message: 'Please check your email for password reset instructions' }))
        .catch(next);
}

function validateResetTokenSchema(req, res, next) {
    const schema = Joi.object({
        token: Joi.string().required()
    });
    validateRequest(req, next, schema);
}

function validateResetToken(req, res, next) {
    accountService.validateResetToken(req.body)
        .then(() => res.json({ message: 'Token is valid' }))
        .catch(next);
}

function resetPasswordSchema(req, res, next) {
    const schema = Joi.object({
        token: Joi.string().required(),
        password: Joi.string().min(6).required(),
        confirmPassword: Joi.string().valid(Joi.ref('password')).required()
    });
    validateRequest(req, next, schema);
}

function resetPassword(req, res, next) {
    accountService.resetPassword(req.body)
        .then(() => res.json({ message: 'Password reset successful, you can now login' }))
        .catch(next);
}

function getAll(req, res, next) {
    const campus_id = req.query.campus_id;

    accountService.getAll(campus_id)
        .then(accounts => res.json(accounts))
        .catch(next);
}

function getById(req, res, next) {
    // users can get their own account and admins can get any account
    if (Number(req.params.id) !== req.user.id && req.user.role !== Role.Admin) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    accountService.getById(req.params.id)
        .then(account => account ? res.json(account) : res.sendStatus(404))
        .catch(next);
}

function createSchema(req, res, next) {
    // Define the schema with conditional password and confirmPassword fields
    const schema = Joi.object({
        // title: Joi.string().required(),
        // firstName: Joi.string().required(),
        // middleName: Joi.string().allow(null, '').optional(),
        // lastName: Joi.string().required(),

        // address: Joi.string().required(),
        // contactNumber: Joi.string().required(),
        // gender: Joi.string().required(),
        
        employee_id: Joi.number().required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        confirmPassword: Joi.string().valid(Joi.ref('password')).required(),

        // role: Joi.alternatives().try(
        //     Joi.string(),
        //     Joi.array().items(Joi.string())
        // ).required(),
        // campus_id: Joi.number().required(),
    });

    validateRequest(req, next, schema);
}


function create(req, res, next) {
    accountService.create(req.body, req.user.id)
        .then(account => res.json(account))
        .catch(next);
}

    /**
     * Schema for updating an existing account
     * @function
     * @param {Object} req - The Express request object
     * @param {Object} res - The Express response object
     * @param {Function} next - The next middleware function
     */
function updateSchema(req, res, next) {
    const roles = req.body.role;

    // Check if roles include SuperAdmin, Admin, or Registrar
    const requirePassword = Array.isArray(roles)
        ? roles.some(role => [Role.SuperAdmin, Role.Admin, Role.Registrar, Role.DataCenter, Role.MIS].includes(role))
        : [Role.SuperAdmin, Role.Admin, Role.Registrar, Role.DataCenter, Role.MIS].includes(roles);

    const schemaRules = {
        // title: Joi.string().empty(''),
        // firstName: Joi.string().empty(''),
        // middleName: Joi.string().allow(null, '').optional(),
        // lastName: Joi.string().empty(''),

        // address: Joi.string().empty(''),
        // contactNumber: Joi.string().empty(''),
        // gender: Joi.string().empty(''),

        employee_id: Joi.number().empty(''),
        email: Joi.string().email().empty(''),
        password: requirePassword ? Joi.string().min(6).empty('') : Joi.any().strip(),
        confirmPassword: requirePassword ? Joi.string().valid(Joi.ref('password')).empty('') : Joi.any().strip(),

        // role: Joi.alternatives().try(
        //     Joi.string(),
        //     Joi.array().items(Joi.string())
        // ).empty(''),

        // campus_id: Joi.number().empty(''),
    };

    // only admins can update role
    // if (req.user.role === Role.Admin) {
    //     schemaRules.role = Joi.string().empty('');
    // }

    const schema = Joi.object(schemaRules).with('password', 'confirmPassword');
    validateRequest(req, next, schema);
}

function update(req, res, next) {
    // users can update their own account and admins can update any account
    if (Number(req.params.id) !== req.user.id && req.user.role !== Role.Admin) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    accountService.update(req.params.id, req.body)
        .then(account => res.json(account))
        .catch(next);
}

function _delete(req, res, next) {
    // users can delete their own account and admins can delete any account
    if (Number(req.params.id) !== req.user.id && req.user.role !== Role.Admin) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    accountService.delete(req.params.id)
        .then(() => res.json({ message: 'Account deleted successfully' }))
        .catch(next);
}

// helper functions

// function setTokenCookie(res, token) {
//     // create cookie with refresh token that expires in 7 days
//     const cookieOptions = {
//         httpOnly: true,
//         expires: new Date(Date.now() + 7*24*60*60*1000)
//     };
//     res.cookie('refreshToken', token, cookieOptions);
// }

// function setTokenCookie(res, token) {
//     const cookieOptions = {
//         httpOnly: true,
//         expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
//         secure: true, // Set to true if your site is served over HTTPS
//         sameSite: 'Strict' // Adjust as necessary
//     };
//     res.cookie('refreshToken', token, cookieOptions);
// }

function setTokenCookie(res, token) {
    const cookieOptions = {
        httpOnly: true,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        secure: process.env.NODE_ENV === 'production', // Set to true if your site is served over HTTPS
        sameSite: 'Strict' // Adjust as necessary
    };
    res.cookie('refreshToken', token, cookieOptions);
}