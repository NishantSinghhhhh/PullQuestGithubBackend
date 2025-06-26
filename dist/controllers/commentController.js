"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentOnIssue = void 0;
const githubComment_1 = require("../utils/githubComment");
const commentOnIssue = async (req, res) => {
    const { owner, repo, issueNumber, labels } = req.body;
    if (!owner || !repo || !issueNumber) {
        res.status(400).json({
            error: "owner, repo and issueNumber are required",
        });
    }
    // Build a dynamic comment; tweak wording as you like
    const labelList = (labels ?? []).join(", ") || "none";
    const commentBody = `🎉  Thanks for opening this!  
  _Labels_: ${labelList}`;
    try {
        const comment = await (0, githubComment_1.postIssueComment)(owner, repo, issueNumber, commentBody);
        res.status(201).json({ html_url: comment.html_url });
    }
    catch (err) {
        console.error("❌ Failed to post comment:", err);
        res.status(502).json({ error: err.message ?? "GitHub request failed" });
    }
};
exports.commentOnIssue = commentOnIssue;
//# sourceMappingURL=commentController.js.map