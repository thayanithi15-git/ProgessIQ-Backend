"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// User routes
router.get('/users', auth_1.authenticate, (req, res) => {
    res.send('User dashboard');
});
exports.default = router;
