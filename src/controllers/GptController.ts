// src/controllers/GptController.ts
import { Request, Response, NextFunction } from "express";
import { reviewCodeWithAI } from "../utils/openai";

export const handleCodeReview = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const { code } = req.body;
    
    if (!code) {
      res.status(400).json({ error: "Code is required" });
      return;
    }
    
    const result = await reviewCodeWithAI({ code });
    res.json(result);
  } catch (error) {
    console.error("Error reviewing code:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};