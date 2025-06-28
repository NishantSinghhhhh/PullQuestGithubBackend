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

// Main interface for MergedPR (matching ingester function)
export interface IMergedPR extends Document {
  // Core PR fields
  prId: number;
  prNumber: number;
  title: string;
  body: string;
  state: string;
  htmlUrl: string;
  
  // PR author
  author: IUser;
  
  // User who received bonus XP (matches ingester)
  awardedUser: {
    userId: string; // MongoDB ObjectId reference to User
    githubUsername: string;
    githubId: number;
    avatarUrl: string;
  };
  
  // XP and bonus info (matches ingester)
  bonusXpAwarded: number;
  awardedBy: string;
  awardedAt: Date;
  
  // Repository info
  repository: IRepository;
  
  // Metadata
  labels: ILabel[];
  
  // PR stats (matches ingester)
  additions: number;
  deletions: number;
  changedFiles: number;
  commentsCount: number;
  
  // Timestamps (matches ingester)
  prCreatedAt: Date;
  prUpdatedAt: Date;
  prMergedAt: Date;
  prClosedAt?: Date;
  
  // Status (matches ingester)
  status: string;
  merged: boolean;
  
  // Additional tracking
  createdAt: Date;
  updatedAt: Date;
}

// User schema
const UserSchema = new Schema({
  id: { type: Number, required: true },
  login: { type: String, required: true },
  avatarUrl: { type: String, default: "" },
  htmlUrl: { type: String, default: "" },
  type: { type: String, default: "User" }
}, { _id: false });

// Awarded user schema (matches ingester)
const AwardedUserSchema = new Schema({
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

// Main MergedPR schema (matching ingester function)
const MergedPRSchema = new Schema({
  // Core PR fields
  prId: { type: Number, required: true, unique: true },
  prNumber: { type: Number, required: true },
  title: { type: String, required: true },
  body: { type: String, default: "" },
  state: { type: String, default: "closed" },
  htmlUrl: { type: String, required: true },
  
  // PR author
  author: { type: UserSchema, required: true },
  
  // User who received bonus XP
  awardedUser: { type: AwardedUserSchema, required: true },
  
  // XP and bonus info
  bonusXpAwarded: { type: Number, required: true, min: 1 },
  awardedBy: { type: String, required: true },
  awardedAt: { type: Date, default: Date.now },
  
  // Repository info
  repository: { type: RepositorySchema, required: true },
  
  // Metadata
  labels: { type: [LabelSchema], default: [] },
  
  // PR stats
  additions: { type: Number, default: 0 },
  deletions: { type: Number, default: 0 },
  changedFiles: { type: Number, default: 0 },
  commentsCount: { type: Number, default: 0 },
  
  // Timestamps
  prCreatedAt: { type: Date, required: true },
  prUpdatedAt: { type: Date, required: true },
  prMergedAt: { type: Date, required: true },
  prClosedAt: { type: Date, required: false },
  
  // Status
  status: { 
    type: String, 
    default: "bonus_awarded",
    enum: ["bonus_awarded", "completed", "archived"]
  },
  merged: { type: Boolean, default: true }
}, {
  timestamps: true // This will automatically manage createdAt and updatedAt
});

// Create indexes for better query performance (matching ingester usage)
MergedPRSchema.index({ 'awardedUser.userId': 1 });
MergedPRSchema.index({ 'awardedUser.githubUsername': 1 });
MergedPRSchema.index({ 'repository.fullName': 1 });
MergedPRSchema.index({ 'author.login': 1 });
MergedPRSchema.index({ awardedAt: -1 });
MergedPRSchema.index({ prId: 1 });
MergedPRSchema.index({ bonusXpAwarded: -1 });
MergedPRSchema.index({ status: 1 });

// Compound indexes for common queries
MergedPRSchema.index({ 'awardedUser.userId': 1, status: 1 });
MergedPRSchema.index({ 'repository.fullName': 1, awardedAt: -1 });

// Model
const MergedPR = mongoose.model<IMergedPR>('MergedPR', MergedPRSchema);

export default MergedPR;
