/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://docs.wavs.xyz',
  generateRobotsTxt: true,
  changefreq: 'daily',
  generateIndexSitemap: false,  // Disable index sitemap
  sitemapSize: 50000  // Maximum size for a single sitemap
}