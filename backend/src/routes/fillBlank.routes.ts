import express, { Request, Response } from "express";
import mongoose from "mongoose";
import { FillBlank } from "../models/FillBlank.model";

const router = express.Router();
const VALID_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

const normalizeText = (value: unknown, max = 1200) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const normalizeOptions = (value: unknown) =>
  Array.isArray(value)
    ? value.map((item) => normalizeText(item, 80)).filter(Boolean)
    : [];

router.get("/", async (req: Request, res: Response) => {
  try {
    const level = normalizeText(req.query.level, 10);
    const filter = VALID_LEVELS.includes(level as any) ? { level } : {};
    const questions = await FillBlank.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      questions,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Không thể tải câu hỏi Fill In Blank",
    });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const question = normalizeText(req.body?.question);
    const options = normalizeOptions(req.body?.options);
    const correctAnswer = normalizeText(req.body?.correctAnswer, 80);
    const level = normalizeText(req.body?.level, 10) || "A1";
    const explanation = normalizeText(req.body?.explanation);

    if (!question || !question.includes("___")) {
      return res.status(400).json({
        success: false,
        message: 'Câu hỏi phải có một chỗ trống bằng ký hiệu "___".',
      });
    }

    if (options.length !== 3) {
      return res.status(400).json({
        success: false,
        message: "Cần đúng 3 lựa chọn.",
      });
    }

    if (new Set(options.map((item) => item.toLowerCase())).size !== options.length) {
      return res.status(400).json({
        success: false,
        message: "Các lựa chọn không được trùng nhau.",
      });
    }

    if (!options.includes(correctAnswer)) {
      return res.status(400).json({
        success: false,
        message: "Đáp án đúng phải trùng chính xác một lựa chọn.",
      });
    }

    if (!VALID_LEVELS.includes(level as any)) {
      return res.status(400).json({
        success: false,
        message: "Cấp độ không hợp lệ.",
      });
    }

    const newQuestion = await FillBlank.create({
      question,
      options,
      correctAnswer,
      level,
      explanation,
    });

    res.status(201).json({
      success: true,
      question: newQuestion,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Không thể tạo câu hỏi Fill In Blank",
    });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "ID câu hỏi không hợp lệ.",
      });
    }

    await FillBlank.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Đã xóa câu hỏi",
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Không thể xóa câu hỏi",
    });
  }
});

export default router;
