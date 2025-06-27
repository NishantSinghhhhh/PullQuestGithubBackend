"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCodeReview = void 0;
const githubcodereview_1 = require("../utils/githubcodereview");
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
        // Send the diff to OpenAI for a GitHub-style review
        const { review, raw } = await (0, githubcodereview_1.reviewCodeForGitHub)({ diff });
        // Respond with the AI review (and raw response if you need it)
        res.status(200).json({
            owner,
            repo,
            prNumber,
            review,
            raw
        });
    }
    catch (err) {
        console.error("❌ Error reviewing code with AI:", err);
        res.status(502).json({ error: err.message ?? "AI review failed" });
    }
};
exports.handleCodeReview = handleCodeReview;
//# sourceMappingURL=AiReviewController.js.map