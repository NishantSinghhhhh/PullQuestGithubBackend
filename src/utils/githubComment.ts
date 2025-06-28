// src/utils/github.ts

export interface IssueCommentResponse {
    id: number;
    node_id: string;
    url: string;
    html_url: string;
    body: string;
    user: {
      login: string;
      id: number;
      node_id: string;
      avatar_url: string;
      html_url: string;
      [key: string]: any;
    };
    created_at: string;
    updated_at: string;
    issue_url: string;
    author_association: string;
    [key: string]: any;
  }
  

export interface ReviewCommentResponse {
    id: number;
    node_id: string;
    url: string;
    body: string;
    user: {
      login: string;
      id: number;
      node_id: string;
      avatar_url: string;
      html_url: string;
      [key: string]: any;
    };
    commit_id: string;
    path: string;
    side: "LEFT" | "RIGHT";
    line: number;
    start_line?: number;
    start_side?: "LEFT" | "RIGHT";
    created_at: string;
    updated_at: string;
    pull_request_url: string;
    [key: string]: any;
  }
  

  export async function postIssueComment(
    owner: string,
    repo: string,
    issueNumber: number,
    commentBody: string
  ): Promise<IssueCommentResponse> {
    const token = process.env.GITHUB_COMMENT_TOKEN;
  
    const url = `https://api.github.com/repos/${encodeURIComponent(
      owner
    )}/${encodeURIComponent(repo)}/issues/${issueNumber}/comments`;
  
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body: commentBody }),
    });
  
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `GitHub API error posting comment: ${res.status} ${res.statusText} — ${text}`
      );
    }
  
    return (await res.json()) as IssueCommentResponse;
  }
  
  export async function postPullRequestComment(
    owner: string,
    repo: string,
    pullNumber: number,
    commentBody: string
  ): Promise<IssueCommentResponse> {
    const token = process.env.GITHUB_COMMENT_TOKEN;
  
    const url = `https://api.github.com/repos/${encodeURIComponent(
      owner
    )}/${encodeURIComponent(repo)}/issues/${pullNumber}/comments`;
  
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body: commentBody }),
    });
  
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `GitHub API error posting PR comment: ${res.status} ${res.statusText} — ${text}`
      );
    }
  
    return (await res.json()) as IssueCommentResponse;
  }


  export async function postPullRequestReviewComment(
    owner: string,
    repo: string,
    pullNumber: number,
    commitId: string,
    path: string,
    line: number,
    side: "LEFT" | "RIGHT",
    commentBody: string,
    diff: string  // ← Add the diff parameter
  ): Promise<ReviewCommentResponse> {
    const token = process.env.GITHUB_COMMENT_TOKEN;
    
    if (!token) {
      throw new Error("GITHUB_COMMENT_TOKEN environment variable is not set");
    }
    
    // Extract the diff hunk for this specific line
    const diffHunk = extractDiffHunk(diff, path, line, side);
    
    if (!diffHunk) {
      console.error(`❌ Could not find diff hunk for ${path}:${line} (${side})`);
      throw new Error(`Could not extract diff hunk for ${path}:${line}`);
    }
    
    console.log(`🔍 Using diff hunk for ${path}:${line}:`);
    console.log(diffHunk.substring(0, 200) + "...");
    
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/` +
                `${encodeURIComponent(repo)}/pulls/${pullNumber}/comments`;
  
    const payload = {
      body: commentBody,
      commit_id: commitId,
      path: path,
      diff_hunk: diffHunk,  // ← Add the diff hunk
      line: line,
      side: side.toLowerCase() as "left" | "right"  // ← GitHub expects lowercase
    };
  
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  
    if (!res.ok) {
      const text = await res.text();
      console.error(`❌ GitHub API Error Details:`, {
        status: res.status,
        statusText: res.statusText,
        response: text,
        payload: { ...payload, diff_hunk: payload.diff_hunk.substring(0, 100) + "..." }
      });
      throw new Error(
        `GitHub API error posting review comment: ${res.status} ${res.statusText} — ${text}`
      );
    }
  
    const result = await res.json();
    console.log(`✅ Successfully posted comment: ${result.html_url}`);
    return result as ReviewCommentResponse;
  }
  
  
  export async function postPRFormComment(
    owner: string,
    repo: string,
    issueNumber: number,
    commentBody: string
  ): Promise<IssueCommentResponse> {
    const token = process.env.GITHUB_COMMENT_TOKEN;
    
    if (!token) {
      throw new Error("GITHUB_COMMENT_TOKEN environment variable is not set");
    }
    
    const url = `https://api.github.com/repos/${encodeURIComponent(
      owner
    )}/${encodeURIComponent(repo)}/issues/${issueNumber}/comments`;
    
    console.log(`🔗 Posting to: ${url}`);
    console.log(`🔑 Token exists: ${!!token}`);
    console.log(`📝 Comment body length: ${commentBody.length}`);
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body: commentBody }),
    });
    
    console.log(`📊 Response status: ${res.status}`);
    
    if (!res.ok) {
      const text = await res.text();
      console.error(`❌ GitHub API error: ${res.status} ${res.statusText}`);
      console.error(`❌ Response body: ${text}`);
      throw new Error(
        `GitHub API error posting comment: ${res.status} ${res.statusText} — ${text}`
      );
    }
    
    const result = await res.json();
    console.log(`✅ Comment posted successfully: ${result.html_url}`);
    return result as IssueCommentResponse;
  }

 export async function fetchCompleteIssueData(owner: string, repo: string, issueNumber: number) {
    const token = process.env.GITHUB_TOKEN;
    
    if (!token) {
      throw new Error("GITHUB_TOKEN environment variable is not set");
    }
    
    const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'PullQuestAI-Bot',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    return await response.json();
  }

  export async function fetchPRDetails(owner: string, repo: string, prNumber: number) {
    const token = process.env.GITHUB_TOKEN;
    
    if (!token) {
      throw new Error("GITHUB_TOKEN environment variable is not set");
    }
    
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;
    
    console.log(`🔍 Fetching PR data from: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'PullQuestAI-Bot',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ GitHub API error: ${response.status} ${response.statusText}`);
      throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const prData = await response.json();
    console.log(`✅ Successfully fetched PR #${prData.number}: ${prData.title}`);
    
    return prData;
  }
  // In src/utils/githubComment.ts (or wherever your GitHub functions are)

export async function getCorrectCommitSha(owner: string, repo: string, prNumber: number): Promise<string> {
  const token = process.env.GITHUB_COMMENT_TOKEN;
  
  if (!token) {
    throw new Error("GITHUB_COMMENT_TOKEN environment variable is not set");
  }
  
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch PR: ${response.status} ${response.statusText}`);
  }
  
  const prData = await response.json();
  
  const headSha = prData.head.sha;
  console.log(`🔍 Using HEAD SHA from PR API: ${headSha}`);
  
  return headSha;
}

function extractDiffHunk(
  unifiedDiff: string,
  targetFile: string,
  targetLine: number,
  side: "LEFT" | "RIGHT"
): string | null {
  const lines = unifiedDiff.split("\n");
  let currentFile = "";
  let hunkLines: string[] = [];
  let inTargetFile = false;
  let oldLineNum = 0;
  let newLineNum = 0;
  let foundTargetLine = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Reset when encountering a new file
    if (line.startsWith("diff --git")) {
      if (foundTargetLine && hunkLines.length > 0) {
        return hunkLines.join("\n");
      }
      hunkLines = [];
      inTargetFile = false;
      foundTargetLine = false;
      continue;
    }
    
    // File path detection
    if (line.startsWith("+++ b/")) {
      currentFile = line.slice(6).trim();
      inTargetFile = currentFile === targetFile;
      continue;
    }
    
    if (!inTargetFile) continue;
    
    // Hunk header
    if (line.startsWith("@@")) {
      const match = /@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
      if (match) {
        oldLineNum = Number(match[1]);
        newLineNum = Number(match[2]);
        hunkLines = [line];
      }
      continue;
    }
    
    // Content lines
    if (hunkLines.length > 0) {
      hunkLines.push(line);
      
      if (line.startsWith(" ")) {
        // Context line
        if ((side === "LEFT" && oldLineNum === targetLine) || 
            (side === "RIGHT" && newLineNum === targetLine)) {
          foundTargetLine = true;
        }
        oldLineNum++;
        newLineNum++;
      } else if (line.startsWith("-")) {
        // Deleted line
        if (side === "LEFT" && oldLineNum === targetLine) {
          foundTargetLine = true;
        }
        oldLineNum++;
      } else if (line.startsWith("+")) {
        // Added line
        if (side === "RIGHT" && newLineNum === targetLine) {
          foundTargetLine = true;
        }
        newLineNum++;
      }
    }
  }
  
  return foundTargetLine && hunkLines.length > 0 ? hunkLines.join("\n") : null;
}