// src/controllers/GptController.ts
import { Request, Response, RequestHandler } from "express";
import util from "util";
import { reviewCodeForGitHub } from "../utils/githubcodereview";
import { postPullRequestReviewComment } from "../utils/githubComment";

interface Suggestion {
  file: string;
  line: number;
  side: "LEFT" | "RIGHT";
  comment: string;
}

export const handleCodeReview: RequestHandler = async (req, res) => {
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
    commitId          // should come from the workflow
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

  /* 1️⃣  Ask OpenAI */
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

  /* 3️⃣  Post inline comments */
  const sha = commitId || req.header("x-github-sha");
  if (!sha) {
    res.status(400).json({ error: "commitId is required (in body or x-github-sha header)" });
    return;
  }

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

  res.status(201).json({ posted: postedUrls.length, urls: postedUrls });
};
