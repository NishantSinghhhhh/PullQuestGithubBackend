// src/controllers/GptController.ts
import { Request, Response, RequestHandler } from "express";
import util from "util";
import { reviewCodeForGitHub } from "../utils/githubcodereview";
import { postPullRequestReviewComment } from "../utils/githubComment";
import { fetchHeadCommitOfPR } from "../utils/githubCommit";   // ← NEW

interface Suggestion {
  file: string;
  line: number;
  side: "LEFT" | "RIGHT";
  comment: string;
}

export const handleCodeReview: RequestHandler = async (req, res) => {
  /* ───────────── Verbose payload logging ───────────── */
  console.log("🟢 RAW req.body object ➜");
  console.dir(req.body, { depth: null, colors: false });

  console.log("🟢 req.body JSON.stringify ➜");
  console.log(JSON.stringify(req.body));

  console.log("🟢 util.inspect(req.body, {depth:null}) ➜");
  console.log(util.inspect(req.body, { depth: null, maxArrayLength: null }));
  /* ─────────────────────────────────────────────────── */

  const {
    owner,
    repo,
    prNumber,
    diff,
    commitId
  }: {
    owner?: string;
    repo?: string;
    prNumber?: number;
    diff?: string;
    commitId?: string;
  } = req.body;

  if (!owner || !repo || !prNumber || !diff) {
    res.status(400).json({ error: "owner, repo, prNumber and diff are required" });
    return;
  }

  /* 1️⃣  Ask OpenAI for suggestions */
  let rawReview: string;
  try {
    const { review } = await reviewCodeForGitHub({ diff });
    rawReview = review;
  } catch (err: any) {
    console.error("❌ AI review failed:", err);
    res.status(502).json({ error: "AI review failed" });
    return;
  }

  /* 2️⃣  Parse AI JSON */
  let suggestions: Suggestion[];
  try {
    suggestions = JSON.parse(rawReview);
  } catch (err: any) {
    console.error("❌ Invalid JSON from AI:", err);
    res.status(502).json({ error: "Invalid JSON from AI" });
    return;
  }

  /* 3️⃣  Resolve commit SHA */
  let sha = commitId || req.header("x-github-sha");
  if (!sha) {
    try {
      const { headSha } = await fetchHeadCommitOfPR(owner!, repo!, prNumber!);
      sha = headSha;
    } catch (err) {
      console.error("❌ Failed to fetch head commit:", err);
      res.status(502).json({ error: "Unable to resolve HEAD commit SHA" });
      return;
    }
  }

  console.log(`📝 Using commit SHA for review comments: ${sha}`);

  /* 4️⃣  Post inline comments */
  const postedUrls: string[] = [];
  for (const s of suggestions) {
    try {
      const c = await postPullRequestReviewComment(
        owner, repo, prNumber, sha, s.file, s.line, s.side, s.comment
      );
      postedUrls.push(c.html_url || c.url);
    } catch (err: any) {
      console.error(`❌ Failed to post comment on ${s.file}:${s.line}`, err);
    }
  }

  /* 5️⃣  Respond to caller (also expose commit SHA we used) */
  res.status(201).json({
    posted: postedUrls.length,
    urls: postedUrls,
    commitIdUsed: sha               // ← transparency for debugging
  });
};
