/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://docs.wavs.xyz',
  generateRobotsTxt: true,
  changefreq: 'daily'
}
