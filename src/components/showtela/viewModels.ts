import type { FeedItem, ShowTelaViewModel } from './types';

export type RawCrusadeData = {
  feed: FeedItem[];
};

export type NormalizeFn = (data: RawCrusadeData) => ShowTelaViewModel;
