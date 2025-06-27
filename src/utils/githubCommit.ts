
/* ------------------------------------------------------------------ */
/* 📝 Very-light commit shape — extend as needed                      */
/* ------------------------------------------------------------------ */
export interface GitHubCommit {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
    committer: {
      name: string;
      email: string;
      date: string;
    };
    tree: { sha: string; url: string };
    comment_count: number;
  };
  author: {
    login: string;
    avatar_url: string;
    html_url: string;
  } | null;
  committer: {
    login: string;
    avatar_url: string;
    html_url: string;
  } | null;
  parents: { sha: string; url: string }[];
  files?: any[];           // add richer typing later if you like
  stats?: { total: number; additions: number; deletions: number };
}

export interface HeadCommitDetails extends GitHubCommit {
  /** Convenient alias (= same value as `sha`) */
  headSha: string;
}

/* ------------------------------------------------------------------ */
/* 🚀 Fetch details for the current HEAD commit of a pull-request     */
/* ------------------------------------------------------------------ */
export async function fetchHeadCommitOfPR(
  owner: string,
  repo: string,
  pullNumber: number,
  extraFetchInit: RequestInit = {}
): Promise<HeadCommitDetails> {
  const token = process.env.GITHUB_COMMENT_TOKEN;

  /* 1️⃣  Get PR metadata to discover the HEAD SHA ------------------ */
  const prResp = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/` +
      `${encodeURIComponent(repo)}/pulls/${pullNumber}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
      ...extraFetchInit,
    }
  );

  if (!prResp.ok) {
    throw new Error(
      `Failed to fetch PR: ${prResp.status} ${prResp.statusText} — ${await prResp.text()}`
    );
  }

  const prJson: { head: { sha: string } } = await prResp.json();
  const headSha = prJson.head.sha;

  /* 2️⃣  Lookup that commit --------------------------------------- */
  const commitResp = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/` +
      `${encodeURIComponent(repo)}/commits/${headSha}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
      ...extraFetchInit,
    }
  );

  if (!commitResp.ok) {
    throw new Error(
      `Failed to fetch commit ${headSha}: ` +
        `${commitResp.status} ${commitResp.statusText} — ${await commitResp.text()}`
    );
  }

  const commitData = (await commitResp.json()) as GitHubCommit;
  return { headSha, ...commitData };
}
