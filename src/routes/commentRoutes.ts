import { Router } from "express";
import { commentOnIssue, commentOnPrs, formComment } from "../controllers/commentController";

const router = Router();

router.post("/issues", commentOnIssue);
router.post("/PullRequest", commentOnPrs);
router.post("/form", formComment);

export default router;