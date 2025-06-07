const { SiteChecker } = require('broken-link-checker');
const chalk = require('chalk');

let hasBrokenLinks = false;

const siteChecker = new SiteChecker(
  {
    excludeExternalLinks: true,
    excludeInternalLinks: false,
    excludeLinksToSamePage: true,
    filterLevel: 0,
    acceptedSchemes: ['http', 'https'],
    maxSockets: 1,
    maxSocketsPerHost: 1,
    rateLimit: 100,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  },
  {
    link: (result) => {
      if (result.broken) {
        hasBrokenLinks = true;
        console.error(
          chalk.red(`❌ BROKEN LINK: ${result.url.original}`),
          chalk.yellow(`\n   Found in: ${result.base.original}`),
          chalk.gray(`\n   Status: ${result.http.response ? result.http.response.statusCode : 'No response'}`)
        );
      }
    },
    end: () => {
      if (hasBrokenLinks) {
        console.error(chalk.red('\n❌ Broken links found! Please fix them before continuing.'));
        process.exit(1);
      } else {
        console.log(chalk.green('\n✅ No broken links found!'));
      }
    }
  }
);

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
console.log(chalk.blue(`\n🔍 Checking links on ${baseUrl}...\n`));
siteChecker.enqueue(baseUrl); 
