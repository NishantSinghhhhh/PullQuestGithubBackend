"use strict";
// Add this to your routes file (e.g., routes/github.ts)
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
// import { handleIssueLabelAssignment } from '../controllers/IssueLabelController';
const AiReviewController_1 = require("../controllers/AiReviewController");
const LabelController_1 = require("../controllers/LabelController");
const router = (0, express_1.Router)();
// Existing routes
router.post('/ai-review', AiReviewController_1.handleCodeReview);
// New comprehensive issue analysis route
router.post('/analyze-issue', LabelController_1.handleIssueAnalysis);
router.post('/generate-pr-summary', LabelController_1.handleIssueAnalysis);
exports.default = router;
//# sourceMappingURL=ai-review.js.map