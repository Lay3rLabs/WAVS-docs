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
    
    // Add .md versions of all documentation pages for AI ingestion
    // Based on the current sitemap structure
    const mdPages = [
      '/benefits.md',
      '/design.md',
      '/handbook/ai.md',
      '/handbook/commands.md',
      '/handbook/components/blockchain-interactions.md',
      '/handbook/components/component.md',
      '/handbook/components/network-requests.md',
      '/handbook/components/utilities.md',
      '/handbook/components/variables.md',
      '/handbook/overview.md',
      '/handbook/service.md',
      '/handbook/submission.md',
      '/handbook/template.md',
      '/handbook/triggers.md',
      '/handbook/workflows.md',
      '/how-it-works.md',
      '/overview.md',
      '/resources/llms.md',
      '/tutorial/1-overview.md',
      '/tutorial/2-setup.md',
      '/tutorial/3-project.md',
      '/tutorial/4-component.md',
      '/tutorial/5-build.md',
      '/tutorial/6-run-service.md',
      '/tutorial/7-prediction.md',
    ];
    
    mdPages.forEach(page => {
      paths.push({
        loc: page,
        changefreq: 'daily',
        priority: 0.7,
      });
    });
    
    return paths;
  }
}