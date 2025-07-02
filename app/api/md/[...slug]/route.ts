import { getPage } from '@/app/source';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

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
  
  // Handle common MDX components
  content = content.replace(/<Callout.*?title="(.*?)".*?>([\s\S]*?)<\/Callout>/g, (_, title, body) => {
    return `\n> **${title}:** ${body.trim()}\n`;
  });
  
  // Handle Card component - both self-closing and with children
  content = content.replace(/<Card.*?title="(.*?)".*?description="(.*?)".*?\/>/g, (_, title, description) => {
    return `\n**${title}**: ${description}\n`;
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
  
  // Handle JSX components
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
  const slugParts = params.slug;
  console.log('MD route called with slug parts:', slugParts);
  
  const page = getPage(slugParts);
  if (!page) {
    return NextResponse.json({ 
      error: 'Page not found',
      slugParts
    }, { status: 404 });
  }
  
  // Get the content
  const contentPath = path.join(process.cwd(), 'content/docs', page.file.path.replace(/^docs\//, ''));
  const content = await readMdxFile(contentPath);
  const markdownContent = processMdxToMarkdown(content);
  
  return new NextResponse(markdownContent, {
    headers: {
      'Content-Type': 'text/markdown',
      'Content-Disposition': `inline; filename="${slugParts.join('-')}.md"`,
    },
  });
}
