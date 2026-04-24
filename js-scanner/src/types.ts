export interface ScannedJob {
  id: string;
  source: 'kwork' | 'weblancer';
  title: string;
  url: string;
  price: number | null;
  currency: string | null;
  description: string;
  publishedAt: string | null;
}
