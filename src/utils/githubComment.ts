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
  