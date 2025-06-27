"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCodeReview = void 0;
const util_1 = __importDefault(require("util"));
const githubcodereview_1 = require("../utils/githubcodereview");
const githubComment_1 = require("../utils/githubComment");
const handleCodeReview = async (req, res) => {
    console.log("🟢 RAW req.body object ➜");
    console.dir(req.body, { depth: null, colors: false });
    console.log("🟢 req.body JSON.stringify ➜");
    console.log(JSON.stringify(req.body));
    console.log("🟢 util.inspect(req.body, {depth:null}) ➜");
    console.log(util_1.default.inspect(req.body, { depth: null, maxArrayLength: null }));
    /* ─────────────────────────────────────────────────── */
    const { owner, repo, prNumber, diff, commitId // should come from the workflow
     } = req.body;
    if (!owner || !repo || !prNumber || !diff) {
        res.status(400).json({ error: "owner, repo, prNumber and diff are required" });
        return;
    }
    /* 1️⃣  Ask OpenAI */
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
    /* 2️⃣  Parse AI JSON */
    let suggestions;
    try {
        suggestions = JSON.parse(rawReview);
    }
    catch (err) {
        console.error("❌ Invalid JSON from AI:", err);
        res.status(502).json({ error: "Invalid JSON from AI" });
        return;
    }
    /* 3️⃣  Post inline comments */
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