"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeInput = exports.securityLogger = void 0;
const securityLogger = (req, res, next) => {
    // Log basic info for security auditing
    console.log(`[SECURITY] ${req.method} ${req.path} - ${req.ip}`);
    next();
};
exports.securityLogger = securityLogger;
const sanitizeInput = (req, res, next) => {
    // Basic sanitization: trim strings in body
    if (req.body && typeof req.body === 'object') {
        Object.keys(req.body).forEach(k => {
            if (typeof req.body[k] === 'string')
                req.body[k] = req.body[k].trim();
        });
    }
    next();
};
exports.sanitizeInput = sanitizeInput;
