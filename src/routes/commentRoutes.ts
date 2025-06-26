import { Router } from "express";
import { commentOnIssue, commentOnPrs } from "../controllers/commentController";

const router = Router();

router.post("/issues", commentOnIssue);
router.post("/PullRequest", commentOnPrs);

export default router;