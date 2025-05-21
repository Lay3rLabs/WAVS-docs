import { getPages } from '@/app/source';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getFileContent(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    // If content is empty, log information
    if (!content) {
      console.log(`Read empty content from file: ${filePath}`);
    }
    return content;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return `[Error reading file: ${error instanceof Error ? error.message : String(error)}]`;
  }
}

async function processContent(content: string): Promise<string> {
  // Remove front matter
  content = content.replace(/^---[\s\S]*?---/, '');
  
  // Clean up MDX components and imports
  content = content.replace(/import[\s\S]*?from.*?;/g, '');
  
  // Handle common MDX components
  content = content.replace(/<Callout.*?title="(.*?)".*?>([\s\S]*?)<\/Callout>/g, (_, title, body) => {
    return `\n**${title}:**\n${body.trim()}\n`;
  });
  
  content = content.replace(/<Card.*?title="(.*?)".*?description="(.*?)".*?\/>/g, (_, title, description) => {
    return `\n**${title}**: ${description}\n`;
  });
  
  // Handle basic JSX
  content = content.replace(/<(\w+)([^>]*)>([\s\S]*?)<\/\1>/g, (_, tag, attrs, content) => {
    return content;
  });
  
  // Remove remaining HTML tags
  content = content.replace(/<[^>]*>/g, '');
  
  // Clean up common Markdown elements for better readability
  content = content.replace(/```\w+\n/g, '```\n');  // Remove language from code blocks
  
  return content.trim();
}

export async function GET(request: NextRequest) {
  const pages = getPages();
  
  // Try to get the navigation order from meta.json
  let navOrder: string[] = [];
  try {
    const metaJsonPath = path.join(process.cwd(), 'content/docs/meta.json');
    const metaJson = JSON.parse(await fs.readFile(metaJsonPath, 'utf-8'));
    navOrder = metaJson.pages.filter((p: string) => !p.startsWith('[')) || [];
  } catch (error) {
    console.error('Error reading meta.json:', error);
  }
  
  // Helper to get page level in navigation hierarchy (for sorting sections)
  function getPageLevel(url: string): number {
    return url.split('/').filter(Boolean).length;
  }
  
  // Sort pages according to navigation order and hierarchy
  const sortedPages = [...pages].sort((a, b) => {
    // Get the top-level section for each page
    const aTopLevel = a.url.split('/').filter(Boolean)[0] || 'index';
    const bTopLevel = b.url.split('/').filter(Boolean)[0] || 'index';
    
    // First check if the top-level sections are in the navigation order
    const aIndex = navOrder.indexOf(aTopLevel);
    const bIndex = navOrder.indexOf(bTopLevel);
    
    if (aIndex !== -1 && bIndex !== -1) {
      if (aIndex !== bIndex) {
        return aIndex - bIndex; // Sort by nav order
      }
    }
    
    // If the top-level sections are the same or not in navOrder, sort by URL path length
    // This keeps subsections together and orders them by hierarchy
    const levelDiff = getPageLevel(a.url) - getPageLevel(b.url);
    if (levelDiff !== 0) {
      return levelDiff;
    }
    
    // If the levels are the same, sort alphabetically by URL
    return a.url.localeCompare(b.url);
  });
  
  // Process the sorted pages
  const allPagesContent = await Promise.all(
    sortedPages.map(async (page) => {
      // Skip external links that might be in the navigation
      if (page.url.startsWith('http')) {
        return '';
      }
      
      // Construct the file path
      const contentPath = path.join(process.cwd(), 'content/docs', page.file.path.replace(/^docs\//, ''));
      
      // Read and process the file content
      let content = await getFileContent(contentPath);
      content = await processContent(content);
      
      // Return page content
      return `# ${page.data.title}
URL: ${page.url}
${(page.data as any).description ? `Description: ${(page.data as any).description}\n` : ''}

${content}

---

`;
    })
  );
  
  // Filter out any empty strings (from skipped items)
  const filteredContent = allPagesContent.filter(content => content.length > 0);
  
  // Add a header section
  const header = `# WAVS Documentation
This file contains all WAVS documentation in a format optimized for large language models.
Website: https://docs.wavs.xyz

---

`;
  
  return new NextResponse(header + filteredContent.join('\n'), {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}