"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const commentController_1 = require("../controllers/commentController");
const router = (0, express_1.Router)();
// Make sure the route path and method are correct
router.post("/issues", commentController_1.commentOnIssue);
exports.default = router;
//# sourceMappingURL=commentRoutes.js.map