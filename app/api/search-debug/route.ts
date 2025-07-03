import { getPages } from '@/app/source';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const pages = getPages();
  
  // Sample a few pages to see their structure
  const samplePages = pages.slice(0, 3).map((page) => ({
    title: page.data.title,
    url: page.url,
    hasStructuredData: !!page.data.exports.structuredData,
    structuredDataKeys: page.data.exports.structuredData ? Object.keys(page.data.exports.structuredData) : [],
    structuredDataSample: page.data.exports.structuredData ? 
      Object.fromEntries(
        Object.entries(page.data.exports.structuredData).slice(0, 2)
      ) : null,
    description: (page.data as any).description || 'No description',
  }));
  
  return NextResponse.json({
    totalPages: pages.length,
    samplePages,
    allPageTitles: pages.map(p => p.data.title),
  });
} 
