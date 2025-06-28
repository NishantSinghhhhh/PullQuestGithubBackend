import mongoose, { Schema, Document } from "mongoose";

// Define interfaces for nested objects
interface IUser {
  id: number;
  login: string;
  avatarUrl: string;
  htmlUrl: string;
  type: string;
}

interface ILabel {
  id: number;
  name: string;
  color: string;
  description: string;
}

interface IMilestone {
  id: number;
  title: string;
  description: string;
  state: string;
  dueOn?: Date;
}

interface IRepository {
  id: number;
  name: string;
  fullName: string;
  htmlUrl: string;
  language: string;
  stargazersCount: number;
  forksCount: number;
  description: string;
}

// Main interface for StakedIssue
export interface IStakedIssue extends Document {
  // Core issue fields
  issueId: number;
  issueNumber: number;
  title: string;
  body: string;
  state: string;
  htmlUrl: string;
  
  // Original issue creator
  issueCreator: IUser;
  
  // Staking user (who staked coins on this issue)
  stakingUser: {
    userId: string; // MongoDB ObjectId reference to User
    githubUsername: string;
    githubId: number;
    avatarUrl: string;
  };
  
  // Metadata
  labels: ILabel[];
  milestone?: IMilestone;
  repository: IRepository;
  
  // Staking specific fields
  stakeAmount: number;
  stakingDate: Date;
  status: "active" | "completed" | "refunded" | "expired";
  
  // Progress tracking
  assignedTo?: IUser;
  prNumber?: number; // If a PR is linked to this staked issue
  prUrl?: string;
  
  // Rewards and completion
  xpReward?: number;
  bountyReward?: number;
  completedAt?: Date;
  refundedAt?: Date;
  
  // Issue metadata
  difficulty?: string;
  estimatedHours?: number;
  commentsCount: number;
  authorAssociation: string;
  
  // Timestamps
  issueCreatedAt: Date;
  issueUpdatedAt: Date;
  issueClosedAt?: Date;
  expirationDate?: Date;
  
  // Staking metadata
  createdAt: Date;
  updatedAt: Date;
}

// User schema (for nested user objects)
const UserSchema = new Schema({
  id: { type: Number, required: true },
  login: { type: String, required: true },
  avatarUrl: { type: String, default: "" },
  htmlUrl: { type: String, default: "" },
  type: { type: String, default: "User" }
}, { _id: false });

// Staking user schema (references our User model)
const StakingUserSchema = new Schema({
  userId: { type: String, required: true }, // ObjectId reference
  githubUsername: { type: String, required: true },
  githubId: { type: Number, required: true },
  avatarUrl: { type: String, default: "" }
}, { _id: false });

// Label schema
const LabelSchema = new Schema({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  color: { type: String, default: "000000" },
  description: { type: String, default: "" }
}, { _id: false });

// Milestone schema
const MilestoneSchema = new Schema({
  id: { type: Number, required: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  state: { type: String, default: "open" },
  dueOn: { type: Date, required: false }
}, { _id: false });

// Repository schema
const RepositorySchema = new Schema({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  fullName: { type: String, required: true },
  htmlUrl: { type: String, required: true },
  language: { type: String, default: "" },
  stargazersCount: { type: Number, default: 0 },
  forksCount: { type: Number, default: 0 },
  description: { type: String, default: "" }
}, { _id: false });

// Main StakedIssue schema
const StakedIssueSchema = new Schema({
  // Core issue fields
  issueId: { type: Number, required: true },
  issueNumber: { type: Number, required: true },
  title: { type: String, required: true },
  body: { type: String, default: "" },
  state: { type: String, default: "open", enum: ["open", "closed"] },
  htmlUrl: { type: String, required: true },
  
  // Original issue creator
  issueCreator: { type: UserSchema, required: true },
  
  // Staking user (who staked coins)
  stakingUser: { type: StakingUserSchema, required: true },
  
  // Metadata
  labels: { type: [LabelSchema], default: [] },
  milestone: { type: MilestoneSchema, required: false },
  repository: { type: RepositorySchema, required: true },
  
  // Staking specific fields
  stakeAmount: { type: Number, required: true, min: 1 },
  stakingDate: { type: Date, default: Date.now },
  status: { 
    type: String, 
    default: "active",
    enum: ["active", "completed", "refunded", "expired"]
  },
  
  // Progress tracking
  assignedTo: { type: UserSchema, required: false },
  prNumber: { type: Number, required: false },
  prUrl: { type: String, required: false },
  
  // Rewards and completion
  xpReward: { type: Number, required: false },
  bountyReward: { type: Number, required: false },
  completedAt: { type: Date, required: false },
  refundedAt: { type: Date, required: false },
  
  // Issue metadata
  difficulty: { 
    type: String, 
    required: false,
    enum: ["easy", "medium", "hard", "expert"]
  },
  estimatedHours: { type: Number, required: false },
  commentsCount: { type: Number, default: 0 },
  authorAssociation: { 
    type: String, 
    default: "NONE",
    enum: ["COLLABORATOR", "CONTRIBUTOR", "FIRST_TIMER", "FIRST_TIME_CONTRIBUTOR", "MANNEQUIN", "MEMBER", "NONE", "OWNER"]
  },
  
  // Timestamps
  issueCreatedAt: { type: Date, required: true },
  issueUpdatedAt: { type: Date, required: true },
  issueClosedAt: { type: Date, required: false },
  expirationDate: { type: Date, required: false }
}, {
  timestamps: true // This will automatically manage createdAt and updatedAt for staking record
});

// Create indexes for better query performance
StakedIssueSchema.index({ 'stakingUser.userId': 1 });
StakedIssueSchema.index({ 'stakingUser.githubUsername': 1 });
StakedIssueSchema.index({ 'repository.fullName': 1 });
StakedIssueSchema.index({ status: 1 });
StakedIssueSchema.index({ stakingDate: -1 });
StakedIssueSchema.index({ issueId: 1 });
StakedIssueSchema.index({ stakeAmount: -1 });

// Compound indexes for common queries
StakedIssueSchema.index({ 'stakingUser.userId': 1, status: 1 });
StakedIssueSchema.index({ 'repository.fullName': 1, status: 1 });

// Model
const StakedIssue = mongoose.model<IStakedIssue>('StakedIssue', StakedIssueSchema);

export default StakedIssue;