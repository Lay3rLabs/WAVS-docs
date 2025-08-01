// This endpoint is for the Fumadocs UI search bar. For programmatic search, use /api/search-custom.
import { getPages } from '@/app/source';
import { createSearchAPI } from 'fumadocs-core/search/server';

export const { GET } = createSearchAPI('advanced', {
  indexes: getPages().map((page) => ({
    title: page.data.title,
    structuredData: page.data.exports.structuredData,
    id: page.url,
    url: page.url,
  })),
});
