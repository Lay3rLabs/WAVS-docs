import { getPages } from '@/app/source';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Section {
  title: string;
  key: string;
  pages: Map<string, PageInfo>;
  subsections: Map<string, Section>;
  externalLinks: Array<{ title: string, url: string }>;
}

interface PageInfo {
  title: string;
  url: string;
  description: string;
}

// Helper function to parse external link format: "[Title](URL)"
function parseExternalLink(linkText: string): { title: string, url: string } | null {
  const match = linkText.match(/\[(.*?)\]\((.*?)\)/);
  if (match && match.length >= 3) {
    return {
      title: match[1],
      url: match[2]
    };
  }
  return null;
}

// Helper function to recursively process meta.json files and build section hierarchy
async function buildSectionHierarchy(sectionPath: string, parentKey: string = ''): Promise<Section | null> {
  const metaPath = path.join(process.cwd(), 'content/docs', sectionPath, 'meta.json');
  
  try {
    const metaContent = await fs.readFile(metaPath, 'utf-8');
    const meta = JSON.parse(metaContent);
    
    const sectionKey = parentKey ? parentKey : sectionPath;
    const pathParts = sectionPath.split('/');
    const lastPart = pathParts.length > 0 ? pathParts[pathParts.length - 1] : '';
    const titleFromPath = lastPart 
      ? lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace(/-/g, ' ') 
      : 'Unknown';
    
    const section: Section = {
      title: meta.title || (sectionPath === '' ? 'Home' : titleFromPath),
      key: sectionKey,
      pages: new Map(),
      subsections: new Map(),
      externalLinks: []
    };
    
    // Process pages in this section
    if (meta.pages) {
      for (const page of meta.pages) {
        // Handle external links
        if (page.includes('[') && page.includes('](')) {
          const externalLink = parseExternalLink(page);
          if (externalLink) {
            section.externalLinks.push(externalLink);
          }
          continue;
        }
        
        // Skip empty entries
        if (page === '') continue;
        
        // Handle parent directory reference (e.g., "../design")
        if (page.startsWith('../')) {
          const parentPage = page.replace('../', '');
          section.pages.set(parentPage, {
            title: parentPage.charAt(0).toUpperCase() + parentPage.slice(1).replace(/-/g, ' '),
            url: `/${parentPage}`,
            description: ''
          });
          continue;
        }
        
        // Check if this is a directory with its own meta.json (subsection)
        const pageOrSectionPath = path.join(sectionPath, page);
        try {
          const subsection = await buildSectionHierarchy(pageOrSectionPath, `${sectionKey}/${page}`);
          if (subsection) {
            section.subsections.set(page, subsection);
          } else {
            // It's a regular page
            section.pages.set(page, {
              title: page.replace(/-\d+-/g, '').charAt(0).toUpperCase() + page.replace(/-\d+-/g, '').slice(1).replace(/-/g, ' '),
              url: sectionPath ? `/${sectionPath}/${page}` : `/${page}`,
              description: ''
            });
          }
        } catch (error) {
          // It's a regular page (no meta.json)
          section.pages.set(page, {
            title: page.replace(/-\d+-/g, '').charAt(0).toUpperCase() + page.replace(/-\d+-/g, '').slice(1).replace(/-/g, ' '),
            url: sectionPath ? `/${sectionPath}/${page}` : `/${page}`,
            description: ''
          });
        }
      }
    }
    
    return section;
  } catch (error) {
    return null;
  }
}

// Helper function to load root level sections
async function getRootSections() {
  const rootMetaPath = path.join(process.cwd(), 'content/docs/meta.json');
  try {
    const rootMetaContent = await fs.readFile(rootMetaPath, 'utf-8');
    const rootMeta = JSON.parse(rootMetaContent);
    
    const sections: Map<string, Section> = new Map();
    
    // Create introduction section to group Home, Overview, Benefits, How it works
    const introSection: Section = {
      title: 'Introduction',
      key: 'intro',
      pages: new Map(),
      subsections: new Map(),
      externalLinks: []
    };
    sections.set('intro', introSection);
    
    // Process root sections
    for (const page of rootMeta.pages) {
      // Handle external links
      if (page.includes('[') && page.includes('](')) {
        const externalLink = parseExternalLink(page);
        if (externalLink) {
          introSection.externalLinks.push(externalLink);
        }
        continue;
      }
      
      // Group intro pages
      if (page === 'index' || page === 'overview' || page === 'benefits' || page === 'how-it-works') {
        introSection.pages.set(page, {
          title: page === 'index' ? 'Home' : page.charAt(0).toUpperCase() + page.slice(1).replace(/-/g, ' '),
          url: page === 'index' ? '/' : `/${page}`,
          description: ''
        });
        continue;
      }
      
      // Process other top-level sections
      const section = await buildSectionHierarchy(page);
      if (section) {
        sections.set(page, section);
      } else {
        // It's a top-level page without a meta.json
        introSection.pages.set(page, {
          title: page.charAt(0).toUpperCase() + page.slice(1).replace(/-/g, ' '),
          url: `/${page}`,
          description: ''
        });
      }
    }
    
    return sections;
  } catch (error) {
    console.error('Error reading root meta.json:', error);
    return new Map();
  }
}

// Update page information with actual data from getPages()
function updatePagesInfo(sections: Map<string, Section>, pagesData: any[]) {
  const pageDataMap = new Map();
  
  // Create a map of URLs to page data
  for (const page of pagesData) {
    const url = page.url;
    pageDataMap.set(url, {
      title: page.data.title,
      url: page.url,
      description: (page.data as any).description || ''
    });
  }
  
  // Recursive function to update pages in sections and subsections
  function updateSection(section: Section) {
    // Update pages in this section
    for (const [key, pageInfo] of section.pages.entries()) {
      const pageData = pageDataMap.get(pageInfo.url);
      if (pageData) {
        section.pages.set(key, {
          ...pageInfo,
          title: pageData.title,
          description: pageData.description
        });
      }
    }
    
    // Update subsections recursively
    for (const subsection of section.subsections.values()) {
      updateSection(subsection);
    }
  }
  
  // Update all sections
  for (const section of sections.values()) {
    updateSection(section);
  }
  
  return sections;
}

// Helper to check if a URL is an external link
function isExternalUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

// Helper to add .md extension to internal URLs
function addMdExtension(url: string): string {
  // Don't modify external URLs
  if (isExternalUrl(url)) {
    return url;
  }
  
  // Don't add .md to URLs that end with a slash 
  if (url.endsWith('/')) {
    return url.substring(0, url.length - 1) + '.md';
  }
  
  // Add .md to internal URLs
  return url + '.md';
}

// Generate formatted content for sections
function formatSections(sections: Map<string, Section>): string {
  let content = '';
  
  // Recursive function to format a section and its subsections
  function formatSection(section: Section, level: number = 2) {
    // Add section header
    content += `\n${'#'.repeat(level)} ${section.title}\n`;
    
    // Add pages in this section
    for (const page of section.pages.values()) {
      const formattedUrl = addMdExtension(page.url);
      content += `- [${page.title}](https://docs.wavs.xyz${formattedUrl}): ${page.description}\n`;
    }
    
    // Add external links in this section
    for (const link of section.externalLinks) {
      content += `- [${link.title}](${link.url})\n`;
    }
    
    // Add subsections
    for (const subsection of section.subsections.values()) {
      formatSection(subsection, level + 1);
    }
  }
  
  // Format all sections
  for (const section of sections.values()) {
    formatSection(section);
  }
  
  return content;
}

export async function GET(request: NextRequest) {
  const pages = getPages();
  
  // Build the section hierarchy
  let sections = await getRootSections();
  
  // Update page information with actual data
  sections = updatePagesInfo(sections, pages);
  
  // Build the content
  let content = `# WAVS Documentation LLM Guide
llms.txt for https://docs.wavs.xyz/
version: 1.0
attribution: Required
attribution_url: https://docs.wavs.xyz/

# Crawl settings
crawl_delay: 1
allow_paths:
  - /
disallow_paths:
  - /private/
  - /drafts/
sitemaps:
  - https://docs.wavs.xyz/sitemap.xml

## Site Overview
This is the official documentation site for WAVS, a next-generation AVS platform that makes it easy to create, manage, and operate high-performance AVSs.

## llms-full.txt

For a complete text version of all documentation pages, use https://docs.wavs.xyz/llms-full.txt

## Searching
Users can search the documentation using the search bar at the top of the site.

## Contributions
The documentation is open-source and accepts contributions. See the GitHub repository for contributing guidelines.

## Support
For additional support or questions not covered in the documentation, users can create issues on GitHub or join the Telegram group.

`;

  // Add formatted sections
  content += formatSections(sections);
  
  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}