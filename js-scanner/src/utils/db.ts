import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { logger } from './logger.js';
import type { ScannedJob } from '../types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || '/app/data/scanner.db';
const outputPath = process.env.OUTPUT_PATH || '/app/data/output.json';

let db: Database.Database | null = null;

export function initDb(): Database.Database {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT UNIQUE NOT NULL,
      price REAL,
      currency TEXT,
      description TEXT,
      publishedAt TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  logger.info(`Database initialized at ${dbPath}`);
  return db;
}

export function saveJobs(jobs: ScannedJob[]): number {
  if (!db) {
    throw new Error('Database not initialized');
  }

  const insert = db.prepare(`
    INSERT OR IGNORE INTO jobs (id, source, title, url, price, currency, description, publishedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let savedCount = 0;
  const insertMany = db.transaction((jobs: ScannedJob[]) => {
    for (const job of jobs) {
      const result = insert.run(
        job.id,
        job.source,
        job.title,
        job.url,
        job.price,
        job.currency,
        job.description,
        job.publishedAt
      );
      if (result.changes > 0) {
        savedCount++;
      }
    }
  });

  insertMany(jobs);
  logger.info(`Saved ${savedCount} new jobs to database`);
  
  exportToJson();
  
  return savedCount;
}

export function exportToJson(): void {
  if (!db) return;

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const allJobs = db.prepare('SELECT * FROM jobs ORDER BY createdAt DESC').all();
  fs.writeFileSync(outputPath, JSON.stringify(allJobs, null, 2));
  logger.info(`Exported ${allJobs.length} jobs to ${outputPath}`);
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
    logger.info('Database closed');
  }
}
