// This endpoint is for programmatic/LLM search. The site search bar uses /api/search.
import { getPages } from '@/app/source';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  score: number;
}

// Simple text search function
function searchPages(pages: any[], query: string): SearchResult[] {
  const results: SearchResult[] = [];
  const lowerQuery = query.toLowerCase();
  
  for (const page of pages) {
    let score = 0;
    let snippet = '';
    
    // Search in title
    const title = page.data.title;
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes(lowerQuery)) {
      score += 10;
      snippet = title;
    }
    
    // Search in description
    const description = (page.data as any).description || '';
    const lowerDescription = description.toLowerCase();
    if (lowerDescription.includes(lowerQuery)) {
      score += 5;
      if (!snippet) snippet = description;
    }
    
    // Search in structured data content
    if (page.data.exports.structuredData?.contents) {
      for (const content of page.data.exports.structuredData.contents) {
        const contentText = content.content || '';
        const lowerContent = contentText.toLowerCase();
        if (lowerContent.includes(lowerQuery)) {
          score += 3;
          if (!snippet) {
            // Create a snippet from the matching content
            const index = lowerContent.indexOf(lowerQuery);
            const start = Math.max(0, index - 50);
            const end = Math.min(contentText.length, index + lowerQuery.length + 50);
            snippet = (start > 0 ? '...' : '') + contentText.substring(start, end) + (end < contentText.length ? '...' : '');
          }
        }
      }
    }
    
    // Search in headings
    if (page.data.exports.structuredData?.headings) {
      for (const heading of page.data.exports.structuredData.headings) {
        const headingText = heading.content || '';
        const lowerHeading = headingText.toLowerCase();
        if (lowerHeading.includes(lowerQuery)) {
          score += 7;
          if (!snippet) snippet = headingText;
        }
      }
    }
    
    // Add to results if we found matches
    if (score > 0) {
      results.push({
        title,
        url: page.url,
        snippet: snippet || title,
        score
      });
    }
  }
  
  // Sort by score (highest first) and limit results
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  
  if (!query || query.trim() === '') {
    return NextResponse.json([]);
  }
  
  const pages = getPages();
  const results = searchPages(pages, query.trim());
  
  return NextResponse.json(results);
} 
