// src/controllers/GptController.ts
import { Request, Response, RequestHandler } from "express";
import util from "util";
import { reviewCodeForGitHub } from "../utils/githubcodereview";
import { postPullRequestReviewComment } from "../utils/githubComment";
import { fetchHeadCommitOfPR } from "../utils/githubCommit";   // keeps the existing helper

/* ──────────────────────────────────────────────────────────────
   LOCAL helper — translate an absolute file/line → (hunk-relative
   line, side) so GitHub accepts the review comment.
   ──────────────────────────────────────────────────────────── */

   function findLineInPatch(
    unifiedDiff: string,
    wantedPath: string,
    wantedLine: number
  ): { lineInHunk: number; side: "LEFT" | "RIGHT" } | null {
    const lines = unifiedDiff.split("\n");
    
    console.log(`🔍 Looking for ${wantedPath}:${wantedLine} in diff`);
    
    let currentPath = "";
    let oldLine = 0;
    let newLine = 0;
    let hunkLinePosition = 0; // Position within the current hunk
    let inCorrectFile = false;
    
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      
      // File header detection
      if (l.startsWith("diff --git")) {
        // Reset for new file
        currentPath = "";
        oldLine = 0;
        newLine = 0;
        hunkLinePosition = 0;
        inCorrectFile = false;
        continue;
      }
      
      // New file path
      if (l.startsWith("+++ b/")) {
        currentPath = l.slice(6).trim();
        inCorrectFile = currentPath === wantedPath;
        console.log(`📂 Found file: ${currentPath}, matches target: ${inCorrectFile}`);
        continue;
      }
      
      // Skip if not in the target file
      if (!inCorrectFile) continue;
      
      // Hunk header e.g. @@ -81,7 +81,7 @@
      if (l.startsWith("@@")) {
        const match = /@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(l);
        if (match) {
          oldLine = Number(match[1]);
          newLine = Number(match[2]);
          hunkLinePosition = 0;
          console.log(`📍 Hunk starts: old=${oldLine}, new=${newLine}`);
        }
        continue;
      }
      
      // Content lines
      if (l.startsWith(" ")) {
        // Context line - appears in both old and new
        hunkLinePosition++;
        if (oldLine === wantedLine) {
          console.log(`✅ Found context line ${wantedLine} at hunk position ${hunkLinePosition}`);
          return { lineInHunk: hunkLinePosition, side: "RIGHT" };
        }
        oldLine++;
        newLine++;
      } else if (l.startsWith("-")) {
        // Deleted line - only in old version
        hunkLinePosition++;
        if (oldLine === wantedLine) {
          console.log(`✅ Found deleted line ${wantedLine} at hunk position ${hunkLinePosition}`);
          return { lineInHunk: hunkLinePosition, side: "LEFT" };
        }
        oldLine++;
      } else if (l.startsWith("+")) {
        // Added line - only in new version
        hunkLinePosition++;
        if (newLine === wantedLine) {
          console.log(`✅ Found added line ${wantedLine} at hunk position ${hunkLinePosition}`);
          return { lineInHunk: hunkLinePosition, side: "RIGHT" };
        }
        newLine++;
      }
    }
    
    console.log(`❌ Line ${wantedLine} not found in ${wantedPath}`);
    console.log(`📊 Final state: oldLine=${oldLine}, newLine=${newLine}`);
    return null;
  }
 
interface Suggestion {
  file: string;
  line: number;                 // absolute line in the file (from GPT)
  side: "LEFT" | "RIGHT";       // GPT’s guess – we’ll recompute anyway
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
  const skipped: Suggestion[] = [];

  for (const s of suggestions) {
    const rel = findLineInPatch(diff, s.file, s.line);
    if (!rel) {
      console.warn(`⚠️  ${s.file}:${s.line} not found in diff – skipping`);
      skipped.push(s);
      continue;
    }
    try {
      const c = await postPullRequestReviewComment(
        owner!,
        repo!,
        prNumber!,
        sha,
        s.file,
        rel.lineInHunk,
        rel.side,
        s.comment
      );
      postedUrls.push(c.html_url || c.url);
    } catch (err: any) {
      console.error(`❌ Failed to post comment on ${s.file}:${s.line}`, err);
    }
  }

  /* 5️⃣  Respond to caller */
  res.status(201).json({
    posted: postedUrls.length,
    urls: postedUrls,
    skipped,
    commitIdUsed: sha
  });
};
