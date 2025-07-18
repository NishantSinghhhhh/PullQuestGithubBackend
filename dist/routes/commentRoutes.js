"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const commentController_1 = require("../controllers/commentController");
const router = (0, express_1.Router)();
router.post("/issues", commentController_1.commentOnIssue);
router.post("/PullRequest", commentController_1.commentOnPrs);
router.post("/form", commentController_1.formComment);
router.post("/XpAddition", commentController_1.AddbonusXp);
exports.default = router;
//# sourceMappingURL=commentRoutes.js.map