import { getPage, getPages } from '@/app/source';
import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Read the raw file content
async function readMdxFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return '';
  }
}

// Process MDX to Markdown
function processMdxToMarkdown(content: string): string {
  // Remove frontmatter (keep it for markdown)
  const frontMatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const frontMatter = frontMatterMatch ? frontMatterMatch[0] : '';
  content = content.replace(/^---[\s\S]*?---/, '');
  
  // Remove imports
  content = content.replace(/import[\s\S]*?from .*?;/g, '');
  
  // Handle Cards container
  content = content.replace(/<Cards>([\s\S]*?)<\/Cards>/g, (_, cardsContent) => {
    return cardsContent;
  });
  
  // Handle Card components with href attribute
  content = content.replace(/<Card\s+[^>]*?href=["']([^"']*?)["'][^>]*?title=["']([^"']*?)["'][^>]*?description=["']([^"']*?)["'][^>]*?(?:\/|><\/Card>)/g, 
    (_, href, title, description) => {
    return `\n### [${title}](${href})\n${description}\n`;
  });
  
  // Handle Card components with title first
  content = content.replace(/<Card\s+[^>]*?title=["']([^"']*?)["'][^>]*?href=["']([^"']*?)["'][^>]*?description=["']([^"']*?)["'][^>]*?(?:\/|><\/Card>)/g, 
    (_, title, href, description) => {
    return `\n### [${title}](${href})\n${description}\n`;
  });
  
  // Handle common MDX components
  content = content.replace(/<Callout.*?title="(.*?)".*?>([\s\S]*?)<\/Callout>/g, (_, title, body) => {
    return `\n> **${title}:** ${body.trim()}\n`;
  });
  
  // Preserve image tags before removing other HTML
  // First, capture img tags with src attribute
  content = content.replace(/<img\s+[^>]*?src=["']([^"']*?)["'][^>]*?alt=["']([^"']*?)["'][^>]*?>/g, (_, src, alt) => {
    return `![${alt}](${src})`;
  });
  
  // Also capture img tags where alt comes before src
  content = content.replace(/<img\s+[^>]*?alt=["']([^"']*?)["'][^>]*?src=["']([^"']*?)["'][^>]*?>/g, (_, alt, src) => {
    return `![${alt}](${src})`;
  });
  
  // Handle img tags without alt text
  content = content.replace(/<img\s+[^>]*?src=["']([^"']*?)["'][^>]*?>/g, (_, src) => {
    return `![Image](${src})`;
  });
  
  // Handle JSX components with closing tags
  content = content.replace(/<(\w+)([^>]*)>([\s\S]*?)<\/\1>/g, (_, tag, attrs, content) => {
    return content;
  });
  
  // Remove remaining HTML tags
  content = content.replace(/<[^>]*>/g, '');
  
  return frontMatter + '\n' + content.trim();
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  try {
    const slugParts = params.slug;
    console.log('MD route called with slug parts:', slugParts);
    console.log('User-Agent:', request.headers.get('user-agent'));
    
    // Special case for the index page
    const isIndexRequest = 
      (slugParts.length === 2 && slugParts[0] === 'docs' && slugParts[1] === 'index');
    
    let page;
    let contentPath;
    
    if (isIndexRequest) {
      // Direct path to index.mdx for the special case
      contentPath = path.join(process.cwd(), 'content/docs/index.mdx');
      console.log('Using index path:', contentPath);
    } else {
      // Normal page lookup via getPage
      // Remove 'docs' prefix if present
      const pageSlug = slugParts[0] === 'docs' ? slugParts.slice(1) : slugParts;
      console.log('Looking up page with pageSlug:', pageSlug);
      page = getPage(pageSlug);
      console.log('Page found:', page ? 'yes' : 'no');
      
      if (!page) {
        console.log('Page not found for pageSlug:', pageSlug);
        return NextResponse.json({ 
          error: 'Page not found',
          slugParts,
          pageSlug,
          availablePages: getPages().map(p => p.url)
        }, { status: 404 });
      }
      contentPath = path.join(process.cwd(), 'content/docs', page.file.path.replace(/^docs\//, ''));
      console.log('Using content path:', contentPath);
    }
    
    // Get the content
    const content = await readMdxFile(contentPath);
    if (!content) {
      console.log('No content found at path:', contentPath);
      return NextResponse.json({ 
        error: 'Content not found',
        contentPath
      }, { status: 404 });
    }
    
    const markdownContent = processMdxToMarkdown(content);
    
    return new NextResponse(markdownContent, {
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Disposition': `inline; filename="${slugParts.join('-')}.md"`,
      },
    });
  } catch (error) {
    console.error('Error in MD route:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      slugParts: params.slug
    }, { status: 500 });
  }
}
