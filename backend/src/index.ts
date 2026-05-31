import dotenv from 'dotenv';
// Load environment variables first
dotenv.config();

import path from 'path';
import express, { Request, Response } from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from './config/passport';
import authRoutes from './routes/auth.routes';
import lessonRoutes from './routes/lesson.routes';
import messageRoutes from './routes/message.routes';
import postRoutes from './routes/post.routes';
import userRoutes from './routes/user.routes';
import adminRoutes from './routes/admin.routes';
import { connectDB } from './config/database';
import chatbotRoutes from "./routes/chatbot.routes";
import fillBlankRoutes from "./routes/fillBlank.routes";
import fillBlankAiRoutes from "./routes/fillBlankAi.routes";
import interviewAiRoutes from "./routes/interviewAi.routes";
import discussionAiRoutes from "./routes/discussionAi.routes";
import presentationAiRoutes from "./routes/presentationAi.routes";
import describePictureAiRoutes from "./routes/describePictureAi.routes";
import writingAiRoutes from "./routes/writingAi.routes";
import matchingHeadingAiRoutes from "./routes/matchingHeadingAi.routes";
import summaryCompletionAiRoutes from "./routes/summaryCompletionAi.routes";
import grammarAiRoutes from "./routes/grammarAi.routes";
import adminReadingAiRoutes from "./routes/adminReadingAi.routes";
import adminFlashcardAiRoutes from "./routes/adminFlashcardAi.routes";
import adminMatchingHeadingAiRoutes from "./routes/adminMatchingHeadingAi.routes";
import adminSummaryCompletionAiRoutes from "./routes/adminSummaryCompletionAi.routes";
import trueFalseAiRoutes from "./routes/trueFalseAi.routes";

const app = express();

const PORT = process.env.PORT || 5000;

const DEFAULT_LOCAL_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3002',
  'http://localhost:4000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3002',
  'http://127.0.0.1:4000',
];

const configuredOrigins = [process.env.FRONTEND_URLS, process.env.FRONTEND_URL]
  .filter((value): value is string => Boolean(value))
  .flatMap((value) => value.split(','))
  .map((origin) => origin.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = Array.from(
  new Set(
    process.env.NODE_ENV === 'production'
      ? configuredOrigins
      : [...configuredOrigins, ...DEFAULT_LOCAL_ORIGINS],
  ),
);

// Connect to MongoDB
connectDB().catch((err) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    const isLocalhostOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    if (ALLOWED_ORIGINS.includes(origin) || (process.env.NODE_ENV !== 'production' && isLocalhostOrigin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'default-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'LingoUp API Server' });
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use("/api/interview-ai", interviewAiRoutes);
app.use("/api/discussion-ai", discussionAiRoutes);
app.use("/api/grammar-ai", grammarAiRoutes);
app.use("/api/presentation-ai", presentationAiRoutes);
app.use("/api/describe-picture-ai", describePictureAiRoutes);
app.use("/api/writing-ai", writingAiRoutes);
app.use("/api/matching-heading-ai", matchingHeadingAiRoutes);
app.use("/api/summary-completion-ai", summaryCompletionAiRoutes);
app.use("/api/fill-blank-ai", fillBlankAiRoutes);
app.use("/api/true-false-ai", trueFalseAiRoutes);
app.use("/api/fill-blank", fillBlankRoutes);
app.use("/api/admin/reading-ai", adminReadingAiRoutes);
app.use("/api/admin/flashcard-ai", adminFlashcardAiRoutes);
app.use("/api/admin/matching-heading-ai", adminMatchingHeadingAiRoutes);
app.use("/api/admin/summary-completion-ai", adminSummaryCompletionAiRoutes);

app.use('/api/messages', messageRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// Để dòng này xuống gần cuối
app.use('/api', lessonRoutes);
// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV}`);
  
});
