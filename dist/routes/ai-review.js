"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AiReviewController_1 = require("../controllers/AiReviewController");
const router = (0, express_1.Router)();
router.post("/ai-review", AiReviewController_1.handleCodeReview);
exports.default = router;
//# sourceMappingURL=ai-review.js.map