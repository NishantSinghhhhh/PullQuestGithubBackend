import { Router } from "express";
import { commentOnIssue, commentOnPrs, formComment, AddbonusXp } from "../controllers/commentController";

const router = Router();

router.post("/issues", commentOnIssue);
router.post("/PullRequest", commentOnPrs);
router.post("/form", formComment);
router.post("/XpAddition", AddbonusXp);

export default router;