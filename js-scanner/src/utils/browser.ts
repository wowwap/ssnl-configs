import { chromium, type Browser, type Page } from 'playwright';
import { logger } from './logger.js';

let browser: Browser | null = null;

export async function launchPlaywright(): Promise<Browser> {
  if (browser && browser.isConnected()) {
    return browser;
  }

  browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
    ],
  });

  return browser;
}

export async function createPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: 'ru-RU',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    bypassCSP: true,
  });

  const page = await context.newPage();
  
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  return page;
}

export async function closeBrowser(): Promise<void> {
  if (browser && browser.isConnected()) {
    await browser.close();
    browser = null;
    logger.info('Browser closed');
  }
}
