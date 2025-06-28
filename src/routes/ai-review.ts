// Add this to your routes file (e.g., routes/github.ts)

import { Router } from 'express';
// import { handleIssueLabelAssignment } from '../controllers/IssueLabelController';
import { handleCodeReview } from '../controllers/AiReviewController';
import { handleIssueAnalysis } from '../controllers/LabelController';

const router = Router();

// Existing routes
router.post('/ai-review', handleCodeReview);

// New comprehensive issue analysis route
router.post('/analyze-issue', handleIssueAnalysis);

export default router;

// Or if you're adding directly to app.ts:
// app.post('/api/github/analyze-issue', handleIssueAnalysis);