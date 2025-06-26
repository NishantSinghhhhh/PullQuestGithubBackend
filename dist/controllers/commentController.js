"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentOnIssue = void 0;
const githubComment_1 = require("../utils/githubComment");
/**
 * POST /api/comment/issues
 * Expects payload like:
 * {
 *   "repo": "PullQuest-Test/backend",
 *   "issue_number": 5,
 *   "labels": ["stake-25", "bug", ...],
 *   "issue_url": "https://github.com/…"
 * }
 */
const commentOnIssue = async (req, res) => {
    console.log("📥 Incoming payload:", JSON.stringify(req.body, null, 2));
    const { repo, issue_number, labels = [] } = req.body;
    if (!repo || !issue_number) {
        res.status(400).json({ error: "repo and issue_number are required" });
        return;
    }
    const [owner, repoName] = repo.split("/");
    if (!owner || !repoName) {
        res.status(400).json({ error: "repo must be in 'owner/repo' format" });
        return;
    }
    /** ───────────────────────────────── stake extraction ───────────────────────────────── */
    // Look for a label of the form "stake-25" (case-insensitive, hyphen or colon allowed)
    let stake = null;
    for (const label of labels) {
        const match = label.match(/^stake[-:\s]?(\d+)$/i);
        if (match) {
            stake = Number(match[1]);
            break;
        }
    }
    // Default message if no stake label present
    const stakeLine = stake !== null
        ? `🪙 **Stake required:** ${stake} coins.\n\nAnyone who wants to work on this issue must first stake **${stake}** coins when opening their PR.`
        : `ℹ️  No stake amount specified for this issue.`;
    const commentBody = [
        "🎉  **Thanks for opening this issue!**",
        "",
        stakeLine
    ].join("\n");
    try {
        const comment = await (0, githubComment_1.postIssueComment)(owner, repoName, issue_number, commentBody);
        res.status(201).json({ html_url: comment.html_url });
    }
    catch (err) {
        console.error("❌ Failed to post comment:", err);
        res.status(502).json({ error: err.message ?? "GitHub request failed" });
    }
};
exports.commentOnIssue = commentOnIssue;
//# sourceMappingURL=commentController.js.map