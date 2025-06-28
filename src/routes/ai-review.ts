// Add this to your routes file (e.g., routes/github.ts)

import { Router } from 'express';
import { handleIssueLabelAssignment } from '../controllers/LabelController';
import { handleCodeReview } from '../controllers/AiReviewController';

const router = Router();

// Existing AI review route
router.post('/ai-review', handleCodeReview);

// New issue label assignment route
router.post('/label-pr-with-issue', handleIssueLabelAssignment);

export default router;

// Or if you're adding directly to app.ts:
// app.post('/api/github/label-pr-with-issue', handleIssueLabelAssignment);