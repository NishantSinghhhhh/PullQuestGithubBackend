// src/controllers/GptController.ts
import { Request, Response, RequestHandler } from "express";
import util from "util";
import { reviewCodeForGitHub } from "../utils/githubcodereview";
import { postPullRequestReviewComment } from "../utils/githubComment";
// import { fetchHeadCommitOfPR } from "../utils/githubCommit";   // keeps the existing helper
import { getCorrectCommitSha } from "../utils/githubComment";

interface ReviewSuggestion {
  file: string;
  line: number;
  side: "LEFT" | "RIGHT";
  comment: string;
}
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
// Replace your entire handleCodeReview function with this:
export const handleCodeReview: RequestHandler = async (req, res) => {
  console.log("📥 Incoming AI review request");

  const { owner, repo, prNumber, diff } = req.body;

  if (!owner || !repo || !prNumber || !diff) {
    res.status(400).json({ error: "owner, repo, prNumber and diff are required" });
    return;
  }

  try {
    /* 1️⃣  Get AI suggestions */
    const { review } = await reviewCodeForGitHub({ diff });
    const suggestions = JSON.parse(review);
    console.log(`🤖 AI generated ${suggestions.length} suggestions`);

    if (suggestions.length === 0) {
      console.log("✅ No suggestions from AI, skipping comment");
      res.status(200).json({ message: "No suggestions to post" });
      return;
    }

    /* 2️⃣  Format as single comprehensive comment */

    const reviewBody: string = `## 🤖 AI Code Review

  I found **${suggestions.length}** suggestion${suggestions.length > 1 ? 's' : ''} for improvement:

  ---

  ${(suggestions as ReviewSuggestion[]).map((s: ReviewSuggestion, i: number): string => `**${i + 1}. \`${s.file}:${s.line}\`**  
  ${s.comment}

  `).join('\n---\n\n')}

  ---

  *This review was generated automatically by AI. Please review the suggestions carefully before implementing.*`;

    /* 3️⃣  Post simple PR comment using Issues API */
    const comment = await postSimplePRComment(owner, repo, prNumber, reviewBody);
    
    console.log(`✅ Posted AI review comment: ${comment.html_url}`);
    
    res.status(201).json({
      success: true,
      comment_url: comment.html_url,
      suggestions_count: suggestions.length
    });

  } catch (err: any) {
    console.error("❌ AI review failed:", err);
    res.status(502).json({ error: "AI review failed: " + err.message });
  }
};

// Simple function to post PR comment (uses Issues API which works for PRs)
async function postSimplePRComment(
  owner: string,
  repo: string,
  pullNumber: number,
  body: string
): Promise<{ html_url: string }> {
  const token = process.env.GITHUB_COMMENT_TOKEN;
  
  if (!token) {
    throw new Error("GITHUB_COMMENT_TOKEN environment variable is not set");
  }

  // Use Issues API - it works for PRs and is much simpler
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${pullNumber}/comments`;

  console.log(`📤 Posting comment to: ${url}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ body }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`❌ GitHub API Error:`, {
      status: response.status,
      statusText: response.statusText,
      response: text
    });
    throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${text}`);
  }

  const result = await response.json();
  return result;
}