import type { Browser } from 'playwright';
import type { ScannedJob } from '../types.js';

export abstract class BaseScraper {
  abstract readonly name: 'kwork' | 'weblancer';
  abstract readonly url: string;

  protected generateId(url: string): string {
    const hash = Buffer.from(url).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
    return `${this.name}_${hash}`;
  }

  protected extractPrice(text: string): { price: number | null; currency: string | null } {
    const match = text.match(/(\d+)\s*(руб|₽|RUB|USD|\$|EUR|€)/i);
    if (match) {
      return {
        price: parseInt(match[1], 10),
        currency: match[2].toLowerCase() === 'руб' || match[2] === '₽' ? 'RUB' : match[2].toUpperCase(),
      };
    }
    return { price: null, currency: null };
  }

  protected normalizeDate(dateStr: string | null): string | null {
    if (!dateStr) return null;
    
    const now = new Date();
    const str = dateStr.toLowerCase().trim();
    
    if (str.includes('сегодня') || str.includes('today')) {
      return now.toISOString();
    }
    
    if (str.includes('вчера') || str.includes('yesterday')) {
      now.setDate(now.getDate() - 1);
      return now.toISOString();
    }
    
    const hoursMatch = str.match(/(\d+)\s*ч(?:ас)?(?:а)?/i);
    if (hoursMatch) {
      now.setHours(now.getHours() - parseInt(hoursMatch[1], 10));
      return now.toISOString();
    }
    
    const daysMatch = str.match(/(\d+)\s*дн?е?(й)?/i);
    if (daysMatch) {
      now.setDate(now.getDate() - parseInt(daysMatch[1], 10));
      return now.toISOString();
    }
    
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
    
    return null;
  }

  abstract scan(browser: Browser, limit: number): Promise<ScannedJob[]>;
}
