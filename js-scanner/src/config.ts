import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  DB_PATH: process.env.DB_PATH || '/app/data/scanner.db',
  OUTPUT_PATH: process.env.OUTPUT_PATH || '/app/data/output.json',
  CRON_SCHEDULE: process.env.CRON_SCHEDULE || '*/30 * * * *',
  LIMIT: parseInt(process.env.LIMIT || '25', 10),
};
