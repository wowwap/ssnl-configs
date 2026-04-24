import cron from 'node-cron';
import { launchPlaywright, closeBrowser } from './utils/browser.js';
import { initDb, saveJobs, closeDb } from './utils/db.js';
import { createScrapers } from './scrapers/index.js';
import { logger } from './utils/logger.js';
import { config } from './config.js';

async function runScan(): Promise<void> {
  logger.info('=== Starting scan cycle ===');
  
  const browser = await launchPlaywright();
  const scrapers = createScrapers();
  let totalSaved = 0;

  try {
    for (const scraper of scrapers) {
      logger.info(`Scanning ${scraper.name}...`);
      const jobs = await scraper.scan(browser, config.LIMIT);
      
      if (jobs.length > 0) {
        const saved = saveJobs(jobs);
        totalSaved += saved;
        logger.info(`${scraper.name}: ${jobs.length} found, ${saved} new`);
      } else {
        logger.info(`${scraper.name}: no jobs found`);
      }
    }
    
    logger.info(`=== Scan cycle complete: ${totalSaved} new jobs saved ===`);
  } catch (err) {
    logger.error(`Scan cycle failed: ${(err as Error).message}`);
  } finally {
    await closeBrowser();
  }
}

async function main(): Promise<void> {
  logger.info('Initializing Freelance JS-Scraper...');
  
  initDb();
  
  logger.info(`Running initial scan...`);
  await runScan();
  
  logger.info(`Scheduling scans with cron: ${config.CRON_SCHEDULE}`);
  cron.schedule(config.CRON_SCHEDULE, async () => {
    await runScan();
  });
  
  logger.info('Scanner is running. Press Ctrl+C to stop.');
  
  process.on('SIGINT', async () => {
    logger.info('Shutting down...');
    await closeBrowser();
    closeDb();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    logger.info('Shutting down...');
    await closeBrowser();
    closeDb();
    process.exit(0);
  });
}

main().catch((err) => {
  logger.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
