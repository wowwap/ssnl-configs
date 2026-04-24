import type { Browser } from 'playwright';
import { BaseScraper } from './base.js';
import { KworkScraper } from './kwork.js';
import { WeblancerScraper } from './weblancer.js';

export function createScrapers(): BaseScraper[] {
  return [
    new KworkScraper(),
    new WeblancerScraper(),
  ];
}
