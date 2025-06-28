"use strict";
// Add this to your routes file (e.g., routes/github.ts)
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const LabelController_1 = require("../controllers/LabelController");
const AiReviewController_1 = require("../controllers/AiReviewController");
const router = (0, express_1.Router)();
// Existing AI review route
router.post('/ai-review', AiReviewController_1.handleCodeReview);
// New issue label assignment route
router.post('/label-pr-with-issue', LabelController_1.handleIssueLabelAssignment);
exports.default = router;
// Or if you're adding directly to app.ts:
// app.post('/api/github/label-pr-with-issue', handleIssueLabelAssignment);
//# sourceMappingURL=ai-review.js.map