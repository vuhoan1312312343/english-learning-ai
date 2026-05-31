import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from '../config/database';
import { Question } from '../models/Question.model';

const isDryRun = process.argv.includes('--dry-run');

const isImageLikeValue = (value: string): boolean => {
  const input = value.trim();
  if (!input) return false;

  if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(input)) {
    return true;
  }

  if (!/^https?:\/\//i.test(input)) {
    return false;
  }

  if (/\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(input)) {
    return true;
  }

  if (/image/i.test(input)) {
    return true;
  }

  return false;
};

async function run() {
  await connectDB();

  const candidates = await Question.find({
    $or: [{ questionImage: { $exists: false } }, { questionImage: null }, { questionImage: '' }],
  })
    .select('_id question questionInVietnamese questionImage')
    .lean();

  let scanned = 0;
  let migrated = 0;
  const ops: mongoose.mongo.AnyBulkWriteOperation[] = [];

  for (const doc of candidates) {
    scanned += 1;
    const rawQuestion = String(doc.question ?? '').trim();
    if (!isImageLikeValue(rawQuestion)) {
      continue;
    }

    migrated += 1;
    const rawQuestionVi = String(doc.questionInVietnamese ?? '').trim();
    const nextQuestionVi = rawQuestionVi === rawQuestion ? ' ' : doc.questionInVietnamese;

    ops.push({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: {
            questionImage: rawQuestion,
            question: ' ',
            questionInVietnamese: nextQuestionVi,
          },
        },
      },
    });
  }

  if (!ops.length) {
    console.log('No legacy records found. Nothing to migrate.');
    return;
  }

  if (isDryRun) {
    console.log(`[dry-run] scanned=${scanned}, toMigrate=${migrated}`);
    return;
  }

  const result = await Question.bulkWrite(ops, { ordered: false });
  console.log(
    `Migration complete: scanned=${scanned}, toMigrate=${migrated}, modified=${result.modifiedCount}`,
  );
}

run()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
