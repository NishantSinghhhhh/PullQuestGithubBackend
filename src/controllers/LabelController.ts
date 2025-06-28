import { RequestHandler } from 'express';

interface IssueLabelRequest {
  owner: string;
  repo: string;
  prNumber: number;
  prTitle: string;
  prBody: string;
  prUrl: string;
}

interface GitHubIssue {
  number: number;
  title: string;
  labels: Array<{ name: string; color: string }>;
}

interface GitHubLabel {
  name: string;
  color: string;
  description?: string;
}

export const handleIssueLabelAssignment: RequestHandler = async (req, res) => {
  console.log("🏷️ Incoming issue label request");

  const { owner, repo, prNumber, prTitle, prBody } = req.body as IssueLabelRequest;

  if (!owner || !repo || !prNumber) {
    res.status(400).json({ error: "owner, repo, and prNumber are required" });
    return;
  }

  try {
    /* 1️⃣ Extract issue numbers from PR title and body */
    const issueNumbers = extractIssueNumbers(prTitle, prBody || '');
    
    if (issueNumbers.length === 0) {
      console.log("ℹ️ No connected issues found in PR");
      res.status(200).json({ 
        message: "No connected issues found",
        labelsAdded: [] 
      });
      return;
    }

    console.log(`🔍 Found ${issueNumbers.length} connected issue(s): ${issueNumbers.join(', ')}`);

    /* 2️⃣ Process each connected issue */
    const labelsAdded: string[] = [];
    
    for (const issueNumber of issueNumbers) {
      try {
        // Fetch issue details
        const issue = await fetchIssueDetails(owner, repo, issueNumber);
        
        // Create label name from issue title
        const labelName = createIssueLabelName(issue.title);
        console.log(`🏷️ Creating label: "${labelName}" for issue #${issueNumber}`);
        
        // Ensure label exists (create if needed)
        await ensureLabelExists(owner, repo, labelName);
        
        // Add label to PR
        await addLabelToPR(owner, repo, prNumber, labelName);
        
        labelsAdded.push(labelName);
        console.log(`✅ Added label "${labelName}" to PR #${prNumber}`);
        
      } catch (issueError: any) {
        console.error(`❌ Failed to process issue #${issueNumber}:`, issueError.message);
        // Continue with other issues
      }
    }

    res.status(200).json({
      success: true,
      connectedIssues: issueNumbers,
      labelsAdded,
      message: `Successfully added ${labelsAdded.length} issue label(s) to PR #${prNumber}`
    });

  } catch (err: any) {
    console.error("❌ Issue label assignment failed:", err);
    res.status(500).json({ error: "Issue label assignment failed: " + err.message });
  }
};

/* 🔍 Extract issue numbers from PR title and body */
function extractIssueNumbers(title: string, body: string): number[] {
  const issueNumbers: Set<number> = new Set();
  
  // Common patterns for referencing issues
  const patterns = [
    /(?:fix|fixes|fixed|close|closes|closed|resolve|resolves|resolved)\s+#(\d+)/gi,
    /(?:relates?|related)\s+(?:to\s+)?#(\d+)/gi,
    /(?:addresses?|addressing)\s+#(\d+)/gi,
    /issue\s*#(\d+)/gi,
    /#(\d+)/g // Generic #123 pattern (less specific, use last)
  ];

  const text = `${title} ${body}`;
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const issueNum = parseInt(match[1], 10);
      if (issueNum > 0) {
        issueNumbers.add(issueNum);
      }
    }
  });

  return Array.from(issueNumbers).sort((a, b) => a - b);
}

/* 🏷️ Create a clean label name from issue title */
function createIssueLabelName(issueTitle: string): string {
  // Remove special characters and normalize
  let cleanTitle = issueTitle
    .replace(/[^\w\s-]/g, '') // Remove special chars except hyphens
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
  
  // Trim to reasonable length (GitHub label limit is 50 chars)
  // Accounting for "Issue-" prefix (6 chars), we have 44 chars left
  if (cleanTitle.length > 35) {
    cleanTitle = cleanTitle.substring(0, 35).trim();
    // Try to cut at word boundary
    const lastSpace = cleanTitle.lastIndexOf(' ');
    if (lastSpace > 20) {
      cleanTitle = cleanTitle.substring(0, lastSpace);
    }
  }
  
  return `Issue-${cleanTitle}`;
}

/* 📡 Fetch issue details from GitHub */
async function fetchIssueDetails(owner: string, repo: string, issueNumber: number): Promise<GitHubIssue> {
  const token = process.env.GITHUB_COMMENT_TOKEN;
  
  if (!token) {
    throw new Error("GITHUB_COMMENT_TOKEN environment variable is not set");
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`;
  
  console.log(`📡 Fetching issue details: ${url}`);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch issue #${issueNumber}: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return await response.json();
}

/* 🏷️ Ensure label exists in repository */
async function ensureLabelExists(owner: string, repo: string, labelName: string): Promise<void> {
  const token = process.env.GITHUB_COMMENT_TOKEN;
  
  if (!token) {
    throw new Error("GITHUB_COMMENT_TOKEN environment variable is not set");
  }

  // First, check if label already exists
  const checkUrl = `https://api.github.com/repos/${owner}/${repo}/labels/${encodeURIComponent(labelName)}`;
  
  const checkResponse = await fetch(checkUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (checkResponse.ok) {
    console.log(`✅ Label "${labelName}" already exists`);
    return;
  }

  // Label doesn't exist, create it
  const createUrl = `https://api.github.com/repos/${owner}/${repo}/labels`;
  
  console.log(`🏷️ Creating new label: "${labelName}"`);

  const createResponse = await fetch(createUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: labelName,
      color: "0052cc", // Nice blue color for issue labels
      description: `Automatically created label for connected issue`
    }),
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(`Failed to create label "${labelName}": ${createResponse.status} ${createResponse.statusText} - ${errorText}`);
  }

  console.log(`✅ Created label "${labelName}"`);
}

/* 🏷️ Add label to PR */
async function addLabelToPR(owner: string, repo: string, prNumber: number, labelName: string): Promise<void> {
  const token = process.env.GITHUB_COMMENT_TOKEN;
  
  if (!token) {
    throw new Error("GITHUB_COMMENT_TOKEN environment variable is not set");
  }

  // First, get current labels on the PR
  const getCurrentLabelsUrl = `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/labels`;
  
  const currentLabelsResponse = await fetch(getCurrentLabelsUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!currentLabelsResponse.ok) {
    throw new Error(`Failed to get current PR labels: ${currentLabelsResponse.status}`);
  }

  const currentLabels: GitHubLabel[] = await currentLabelsResponse.json();
  const currentLabelNames = currentLabels.map(label => label.name);
  
  // Check if label is already applied
  if (currentLabelNames.includes(labelName)) {
    console.log(`ℹ️ Label "${labelName}" already applied to PR #${prNumber}`);
    return;
  }

  // Add the new label to existing labels
  const updatedLabels = [...currentLabelNames, labelName];

  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/labels`;
  
  console.log(`🏷️ Adding label "${labelName}" to PR #${prNumber}`);

  const response = await fetch(url, {
    method: "PUT", // PUT replaces all labels, so we include existing ones
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updatedLabels),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to add label to PR #${prNumber}: ${response.status} ${response.statusText} - ${errorText}`);
  }

  console.log(`✅ Successfully added label "${labelName}" to PR #${prNumber}`);
}