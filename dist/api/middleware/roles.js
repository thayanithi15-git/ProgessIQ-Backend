"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = exports.requireMentor = exports.requireStudent = void 0;
const auth_1 = require("./auth");
exports.requireStudent = [auth_1.authenticate, (0, auth_1.authorizeRoles)('STUDENT')];
exports.requireMentor = [auth_1.authenticate, (0, auth_1.authorizeRoles)('MENTOR')];
exports.requireAdmin = [auth_1.authenticate, (0, auth_1.authorizeRoles)('ADMIN')];
