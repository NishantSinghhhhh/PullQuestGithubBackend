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
    commentBody: string
  ): Promise<ReviewCommentResponse> {
    const token = process.env.GITHUB_COMMENT_TOKEN;
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/` +
                `${encodeURIComponent(repo)}/pulls/${pullNumber}/comments`;
  
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body: commentBody,
        commit_id: commitId,
        path,
        line,
        side,
        // For multi-line comments, you can also include:
        // start_line: <number>,
        // start_side: "LEFT" | "RIGHT"
      }), 
    });
  
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `GitHub API error posting review comment: ${res.status} ${res.statusText} — ${text}`
      );
    }
  
    return (await res.json()) as ReviewCommentResponse;
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