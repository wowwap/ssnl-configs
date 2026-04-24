import type { Browser, Page } from 'playwright';
import { BaseScraper } from './base.js';
import { createPage } from '../utils/browser.js';
import { logger } from '../utils/logger.js';
import type { ScannedJob } from '../types.js';

export class WeblancerScraper extends BaseScraper {
  readonly name: 'weblancer' = 'weblancer';
  readonly url = 'https://www.weblancer.net/jobs/';

  async scan(browser: Browser, limit: number): Promise<ScannedJob[]> {
    const jobs: ScannedJob[] = [];
    let page: Page | null = null;

    try {
      page = await createPage(browser);
      logger.info(`[Weblancer] Navigating to ${this.url}`);

      await page.goto(this.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      await page.waitForSelector('.job-card, .project-item, [class*="job"], [class*="project"]', { timeout: 15000 }).catch(() => {
        logger.warn('[Weblancer] Primary selectors not found, trying fallback');
      });

      await page.waitForTimeout(3000);

      const cardSelectors = [
        '.job-card',
        '.project-item',
        '[class*="job-item"]',
        '.jobs-list li',
        '.item-job',
        'li.job',
      ];

      let cards: any[] = [];
      for (const selector of cardSelectors) {
        cards = await page.$$(selector);
        if (cards.length > 0) {
          logger.info(`[Weblancer] Found ${cards.length} cards with selector: ${selector}`);
          break;
        }
      }

      if (cards.length === 0) {
        const links = await page.$$eval('a[href*="/jobs/"]', (els: HTMLAnchorElement[]) => 
          els.slice(0, limit).map(el => ({
            title: el.textContent?.trim() || '',
            href: el.href,
            parent: el.parentElement?.textContent?.trim() || '',
          }))
        );

        for (const link of links.slice(0, limit)) {
          if (!link.href || !link.title) continue;
          
          const { price, currency } = this.extractPrice(link.parent);
          
          jobs.push({
            id: this.generateId(link.href),
            source: this.name,
            title: link.title,
            url: link.href,
            price,
            currency,
            description: link.parent,
            publishedAt: null,
          });
        }
        
        return jobs.slice(0, limit);
      }

      for (let i = 0; i < Math.min(cards.length, limit); i++) {
        try {
          const card = cards[i];
          
          const titleEl = await card.$('h2 a, h3 a, .title a, [class*="title"] a');
          const title = await titleEl?.textContent() || '';
          const url = await titleEl?.getAttribute('href') || '';
          
          if (!url) {
            const linkEl = await card.$('a[href*="/jobs/"]');
            if (linkEl) {
              const fallbackUrl = await linkEl.getAttribute('href');
              if (fallbackUrl && !url) {
                continue;
              }
            }
          }

          const fullUrl = url.startsWith('http') ? url : `https://www.weblancer.net${url}`;
          
          const priceText = await card.textContent() || '';
          const { price, currency } = this.extractPrice(priceText);

          const descEl = await card.$('.description, [class*="desc"], p, .text');
          const description = (await descEl?.textContent() || priceText).trim().slice(0, 1000);

          const dateEl = await card.$('.date, time, [class*="time"], [class*="date"], .published');
          const dateText = await dateEl?.textContent() || null;
          const publishedAt = this.normalizeDate(dateText);

          if (title && fullUrl.includes('/jobs/')) {
            jobs.push({
              id: this.generateId(fullUrl),
              source: this.name,
              title: title.trim(),
              url: fullUrl,
              price,
              currency,
              description,
              publishedAt,
            });
          }
        } catch (err) {
          logger.warn(`[Weblancer] Error parsing card ${i}: ${(err as Error).message}`);
          continue;
        }
      }

      logger.info(`[Weblancer] Parsed ${jobs.length} jobs`);
    } catch (err) {
      const errorMsg = (err as Error).message;
      if (errorMsg.includes('Cloudflare') || errorMsg.includes('captcha') || errorMsg.includes('403')) {
        logger.warn(`[Weblancer] Blocked by Cloudflare/captcha: ${errorMsg}`);
        return [];
      }
      logger.error(`[Weblancer] Scan error: ${errorMsg}`);
    } finally {
      if (page) {
        await page.close().catch(() => {});
      }
    }

    return jobs.slice(0, limit);
  }
}
