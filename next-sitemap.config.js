/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://docs.wavs.xyz',
  generateRobotsTxt: true,
  changefreq: 'daily',
  generateIndexSitemap: false,  // Disable index sitemap
  sitemapSize: 50000,  // Maximum size for a single sitemap
  additionalPaths: async (config) => {
    const paths = [];
    
    // Add LLM-specific files
    paths.push({
      loc: '/llms.txt',
      changefreq: 'daily',
      priority: 0.8,
    });
    
    paths.push({
      loc: '/llms-full.txt',
      changefreq: 'daily',
      priority: 0.8,
    });
    
    paths.push({
      loc: '/wavs-foundry-template.md',
      changefreq: 'weekly',
      priority: 0.6,
    });
    
    paths.push({
      loc: '/wavs-wasi-utils.md',
      changefreq: 'weekly',
      priority: 0.6,
    });
    
    // Dynamically add .md versions of all documentation pages for AI ingestion
    try {
      // Import the getPages function from your source
      const { getPages } = require('./app/source');
      const pages = getPages();
      
      // Add .md version of each page
      pages.forEach(page => {
        if (page.url) {
          paths.push({
            loc: `${page.url}.md`,
            changefreq: 'daily',
            priority: 0.7,
          });
        }
      });
    } catch (error) {
      console.warn('Could not dynamically load pages for sitemap:', error);
    }
    
    return paths;
  }
}