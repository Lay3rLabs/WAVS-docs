"use client";

import { useState, useRef, useEffect } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { ChevronDown, ExternalLink, Copy, FileText } from 'lucide-react';
import { usePathname } from 'next/navigation';

export const OpenInLLM = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get current URL for generating the LLM links
  const currentUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}${pathname}`
    : '';
  
  // Special handling for index page
  const isIndexPage = pathname === '/' || pathname === '/docs' || pathname === '/docs/';
  
  // For index page, point to a specific markdown file
  const markdownUrl = isIndexPage
    ? `${window.location.origin}/docs/index.md`
    : `${currentUrl}.md`;

  // Function to create Claude URL
  const getClaudeUrl = () => {
    const url = isIndexPage ? `${window.location.origin}/api/md/docs/index` : markdownUrl;
    return `https://claude.ai/new?q=${encodeURIComponent(`Read from ${url} so I can ask questions about it`)}`;
  };

  // Function to create ChatGPT URL
  const getChatGPTUrl = () => {
    const url = isIndexPage ? `${window.location.origin}/api/md/docs/index` : markdownUrl;
    return `https://chatgpt.com/?hints=search&q=${encodeURIComponent(`Read from ${url} so I can ask questions about it`)}`;
  };

  // Function to copy markdown content
  const copyMarkdown = async () => {
    try {
      // For index page, we need to fetch the index.mdx file and convert it
      if (isIndexPage) {
        // Try to fetch from the API endpoint if available
        try {
          const apiUrl = `${window.location.origin}/api/md/docs/index`;
          const response = await fetch(apiUrl);
          if (response.ok) {
            const markdown = await response.text();
            await navigator.clipboard.writeText(markdown);
            setIsOpen(false);
            return;
          }
        } catch (e) {
          console.warn('API fetch failed, falling back to direct fetch', e);
        }
      }
      
      // Standard approach for non-index pages or if API fails
      const response = await fetch(markdownUrl);
      const markdown = await response.text();
      await navigator.clipboard.writeText(markdown);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to copy markdown:', error);
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button 
            className="flex items-center gap-2 rounded-lg bg-[hsl(var(--background-primary))] px-3 py-2 text-sm text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--background-secondary))] border border-[hsl(var(--border-primary))]"
          >
            <span className="hidden sm:inline">Open in Claude</span>
            <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="absolute right-0 top-full z-50 mt-1 w-64 rounded-lg bg-[hsl(var(--background-base))] p-1 shadow-lg border border-[hsl(var(--border-primary))]">
          <div className="overflow-hidden rounded-md">
            <a 
              href={getClaudeUrl()}
              target="_blank"
              rel="noopener noreferrer" 
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--background-primary))]"
              onClick={() => setIsOpen(false)}
            >
              <span className="flex h-5 w-5 items-center justify-center">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L4 5V11.5C4 16.6 7.4 21.2 12 22C16.6 21.2 20 16.6 20 11.5V5L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <div className="flex flex-col">
                <span>Open in Claude</span>
                <span className="text-xs text-[hsl(var(--text-tertiary))]">Ask questions about this page</span>
              </div>
              <ExternalLink size={14} className="ml-auto text-[hsl(var(--text-tertiary))]" />
            </a>
            
            <a 
              href={getChatGPTUrl()}
              target="_blank"
              rel="noopener noreferrer" 
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--background-primary))]"
              onClick={() => setIsOpen(false)}
            >
              <span className="flex h-5 w-5 items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </span>
              <div className="flex flex-col">
                <span>Open in ChatGPT</span>
                <span className="text-xs text-[hsl(var(--text-tertiary))]">Ask questions about this page</span>
              </div>
              <ExternalLink size={14} className="ml-auto text-[hsl(var(--text-tertiary))]" />
            </a>

            <button 
              onClick={copyMarkdown}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--background-primary))]"
            >
              <span className="flex h-5 w-5 items-center justify-center">
                <Copy size={16} />
              </span>
              <div className="flex flex-col">
                <span>Copy page</span>
                <span className="text-xs text-[hsl(var(--text-tertiary))]">Copy page as Markdown for LLMs</span>
              </div>
            </button>
            
            <a 
              href={isIndexPage ? `${window.location.origin}/api/md/docs/index` : markdownUrl}
              target="_blank"
              rel="noopener noreferrer" 
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--background-primary))]"
              onClick={() => setIsOpen(false)}
            >
              <span className="flex h-5 w-5 items-center justify-center">
                <FileText size={16} />
              </span>
              <div className="flex flex-col">
                <span>View as Markdown</span>
                <span className="text-xs text-[hsl(var(--text-tertiary))]">View this page as plain text</span>
              </div>
              <ExternalLink size={14} className="ml-auto text-[hsl(var(--text-tertiary))]" />
            </a>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};