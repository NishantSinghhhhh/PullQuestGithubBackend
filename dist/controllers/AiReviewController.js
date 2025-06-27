"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCodeReview = void 0;
const githubcodereview_1 = require("../utils/githubcodereview");
const githubComment_1 = require("../utils/githubComment");
const handleCodeReview = async (req, res) => {
    /* 🚩  FULL payload log — nothing is filtered */
    console.log("🟢 RAW payload:", req.body);
    /* pretty-printed version as before */
    console.log("📥 Incoming AI review payload:", JSON.stringify(req.body, null, 2));
    /* ── Destructure, now including commitId ──────────────────────────*/
    const { owner, repo, prNumber, diff, commitId // may come from the workflow payload
     } = req.body;
    if (!owner || !repo || !prNumber || !diff) {
        res.status(400).json({
            error: "owner, repo, prNumber and diff are required"
        });
        return;
    }
    /* 1️⃣  Call OpenAI */
    let rawReview;
    try {
        const { review } = await (0, githubcodereview_1.reviewCodeForGitHub)({ diff });
        rawReview = review;
    }
    catch (err) {
        console.error("❌ AI review failed:", err);
        res.status(502).json({ error: "AI review failed" });
        return;
    }
    /* 2️⃣ Parse AI JSON */
    let suggestions;
    try {
        suggestions = JSON.parse(rawReview);
    }
    catch (err) {
        console.error("❌ Invalid JSON from AI:", err);
        res.status(502).json({ error: "Invalid JSON from AI" });
        return;
    }
    /* 3️⃣ Post inline comments */
    const sha = commitId || req.header("x-github-sha");
    if (!sha) {
        res.status(400).json({ error: "commitId is required (in body or x-github-sha header)" });
        return;
    }
    const postedUrls = [];
    for (const s of suggestions) {
        try {
            const c = await (0, githubComment_1.postPullRequestReviewComment)(owner, repo, prNumber, sha, s.file, s.line, s.side, s.comment);
            postedUrls.push(c.html_url || c.url);
        }
        catch (err) {
            console.error(`❌ Failed to post comment on ${s.file}:${s.line}`, err);
        }
    }
    res.status(201).json({ posted: postedUrls.length, urls: postedUrls });
};
exports.handleCodeReview = handleCodeReview;
//# sourceMappingURL=AiReviewController.js.map