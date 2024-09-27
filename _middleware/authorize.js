require('dotenv').config();
const jwt = require('express-jwt');
const db = require('_helpers/db');

module.exports = authorize;

function authorize(roles = []) {
    // roles param can be a single role string (e.g. Role.User or 'User') 
    // or an array of roles (e.g. [Role.Admin, Role.User] or ['Admin', 'User'])
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return [
        // authenticate JWT token and attach user to request object (req.user)
        jwt({ secret: process.env.SECRET, algorithms: ['HS256'] }),

        // authorize based on user role
        // async (req, res, next) => {
        //     const account = await db.Account.findByPk(req.user.id);

        //     if (!account || (roles.length && !roles.includes(employee.role))) {
        //         // account no longer exists or role not authorized
        //         return res.status(401).json({ message: 'Unauthorized' });
        //     }

        //     // authentication and authorization successful
        //     req.user.role = employee.role;
        //     const refreshTokens = await account.getRefreshTokens();
        //     req.user.ownsToken = token => !!refreshTokens.find(x => x.token === token);
        //     next();
        // }

        async (req, res, next) => {
            const account = await db.Account.findByPk(req.user.id);
            
            if (!account) {
                return res.status(401).json({ message: 'Unauthorized' });
            }
            
            const employee = await db.Employee.findByPk(account.employee_id);
            
            if (!employee) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const accountRoles = employee.role.split(',').map(role => role.trim());

            console.log("Account Roles: ", accountRoles)
        
            const isAuthorized = roles.some(role => accountRoles.includes(role));

            console.log("IS AUTHORIZED??: ", isAuthorized)
            
            if (roles.length && !isAuthorized) {
                return res.status(401).json({ message: 'Unauthorized' });
            }
        
            req.user.role = employee.role;
            const refreshTokens = await account.getRefreshTokens();
            req.user.ownsToken = token => !!refreshTokens.find(x => x.token === token);
            next();
        }
        
    ];
}