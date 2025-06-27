"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentOnPrReview = exports.handleCodeReview = void 0;
const openai_1 = require("../utils/openai");
const githubComment_1 = require("../utils/githubComment");
/**
 * POST /api/ai-review
 * Expects JSON payload:
 * {
 *   owner: string,
 *   repo: string,
 *   prNumber: number,
 *   diff: string
 * }
 */
const handleCodeReview = async (req, res) => {
    console.log("📥 Incoming AI review payload:", JSON.stringify(req.body, null, 2));
    const { owner, // e.g. "PullQuest-Test"
    repo, // e.g. "backend"
    prNumber, // e.g. 12
    diff // the unified diff text
     } = req.body;
    if (!owner || !repo || !prNumber || !diff) {
        res.status(400).json({ error: "owner, repo, prNumber and diff are required" });
        return;
    }
    try {
        // send the diff to OpenAI for review
        const aiResult = await (0, openai_1.reviewCodeWithAI)({ code: diff });
        // aiResult could be e.g. { review: string }
        res.status(200).json(aiResult);
    }
    catch (err) {
        console.error("❌ Error reviewing code with AI:", err);
        res.status(502).json({ error: err.message ?? "AI review failed" });
    }
};
exports.handleCodeReview = handleCodeReview;
const commentOnPrReview = async (req, res) => {
    console.log("📥 Incoming PR review payload:", JSON.stringify(req.body, null, 2));
    const { owner, // e.g. "PullQuest-Test"
    repo, // e.g. "backend"
    pullNumber, // e.g. 12
    commitId, // e.g. git SHA
    path, // e.g. "src/index.ts"
    line, // e.g. 42
    side, // "LEFT" or "RIGHT"
    body // the AI-generated comment text
     } = req.body;
    // Validate required fields
    if (!owner || !repo || !pullNumber || !commitId || !path || !line || !side || !body) {
        res.status(400).json({
            error: "owner, repo, pullNumber, commitId, path, line, side and body are all required"
        });
        return;
    }
    try {
        const reviewComment = await (0, githubComment_1.postPullRequestReviewComment)(owner, repo, pullNumber, commitId, path, line, side, body);
        res.status(201).json({ url: reviewComment.html_url || reviewComment.url });
    }
    catch (err) {
        console.error("❌ Failed to post PR review comment:", err);
        res.status(502).json({ error: err.message ?? "GitHub review-comment request failed" });
    }
};
exports.commentOnPrReview = commentOnPrReview;
//# sourceMappingURL=AiReviewController.js.map