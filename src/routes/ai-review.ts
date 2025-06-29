// Add this to your routes file (e.g., routes/github.ts)

import { Router } from 'express';
// import { handleIssueLabelAssignment } from '../controllers/IssueLabelController';
import { handleCodeReview } from '../controllers/AiReviewController';
import { handleIssueAnalysis } from '../controllers/LabelController';
import { handlePRSummary } from '../controllers/GptController';
const router = Router();

// Existing routes
router.post('/ai-review', handleCodeReview);

// New comprehensive issue analysis route
router.post('/analyze-issue', handleIssueAnalysis);

router.post('/generate-pr-summary', handlePRSummary);

export default router;

