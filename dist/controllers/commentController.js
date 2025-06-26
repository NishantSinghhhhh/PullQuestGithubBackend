"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentOnPrs = exports.commentOnIssue = void 0;
const githubComment_1 = require("../utils/githubComment");
const commentOnIssue = async (req, res) => {
    console.log("📥 Incoming payload:", JSON.stringify(req.body, null, 2));
    const { owner, // "PullQuest-Test"
    repo, // "backend"
    issueNumber, // 6
    labels = [] // ["stake-30","question",…]
     } = req.body;
    if (!owner || !repo || !issueNumber) {
        res.status(400).json({ error: "owner, repo and issueNumber are required" });
        return;
    }
    // look for "stake-<N>"
    const stakeLabel = labels.find(l => /^stake[-:\s]?(\d+)$/i.test(l));
    const stakeAmt = stakeLabel ? Number(stakeLabel.match(/(\d+)/)[1]) : null;
    const commentBody = stakeAmt
        ? `🎉  Thanks for opening this issue!\n\n🪙 **Stake required:** ${stakeAmt} coins.\n\nAnyone who submits a PR must first stake **${stakeAmt}** coins from their balance.`
        : `🎉  Thanks for opening this issue!`;
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
const commentOnPrs = async (req, res) => {
    console.log("📥 Incoming payload:", JSON.stringify(req.body, null, 2));
    const { owner, repo, prNumber, labels = [] } = req.body;
    if (!owner || !repo || !prNumber) {
        res.status(400).json({ error: "owner, repo and prNumber are required" });
        return;
    }
    const stakeLabel = labels.find(l => /^stake[-:\s]?(\d+)$/i.test(l));
    const stakeAmt = stakeLabel ? Number(stakeLabel.match(/(\d+)/)[1]) : null;
    const commentBody = stakeAmt
        ? `🎉  Thanks for opening this pull request!\n\n🪙 **Stake required:** ${stakeAmt} coins.\n\nPlease stake **${stakeAmt}** coins from your balance before we can review.`
        : `🎉  Thanks for opening this pull request!`;
    try {
        const comment = await (0, githubComment_1.postIssueComment)(owner, repo, prNumber, commentBody);
        res.status(201).json({ html_url: comment.html_url });
    }
    catch (err) {
        console.error("❌ Failed to post comment:", err);
        res.status(502).json({ error: err.message ?? "GitHub request failed" });
    }
};
exports.commentOnPrs = commentOnPrs;
//# sourceMappingURL=commentController.js.map