"use client";

import { useState, useRef, useEffect } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { ChevronDown, ExternalLink, Copy, FileText, Book } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useMediaQuery } from './hooks/use-media-query';
import Image from 'next/image';
import { useTheme } from 'next-themes';

export const OpenInLLM = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, resolvedTheme } = useTheme();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  // Handle hydration mismatch by waiting for client-side rendering
  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Special handling for index page
  const isIndexPage = pathname === '/' || pathname === '/docs' || pathname === '/docs/';
  
  // Get current URL for generating the LLM links - safely handled for SSR
  const [currentUrl, setCurrentUrl] = useState('');
  const [markdownUrl, setMarkdownUrl] = useState('');
  
  // Set up URLs once we're mounted on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const baseUrl = `${window.location.origin}${pathname}`;
      setCurrentUrl(baseUrl);
      
      // For index page, point to a specific markdown file
      if (isIndexPage) {
        setMarkdownUrl(`${window.location.origin}/docs/index.md`);
      } else {
        setMarkdownUrl(`${baseUrl}.md`);
      }
    }
  }, [pathname, isIndexPage]);

  // Function to create Claude URL
  const getClaudeUrl = () => {
    if (!mounted || typeof window === 'undefined') return '#';
    const url = isIndexPage ? `${window.location.origin}/api/md/docs/index` : markdownUrl;
    return `https://claude.ai/new?q=${encodeURIComponent(`Read from ${url} so I can ask questions about it`)}`;
  };

  // Function to create ChatGPT URL
  const getChatGPTUrl = () => {
    if (!mounted || typeof window === 'undefined') return '#';
    const url = isIndexPage ? `${window.location.origin}/api/md/docs/index` : markdownUrl;
    return `https://chatgpt.com/?hints=search&q=${encodeURIComponent(`Read from ${url} so I can ask questions about it`)}`;
  };

  // Function to copy markdown content
  const copyMarkdown = async () => {
    if (!mounted || typeof window === 'undefined') return;
    
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
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[hsl(var(--text-secondary))] bg-[hsl(var(--background-secondary))] hover:text-[hsl(var(--text-accent))] hover:bg-[hsl(var(--background-accent))] transition-colors border border-[hsl(var(--border-primary))] shadow-sm"
          >
            {isMobile ? (
              <>
                <Book size={18} />
                <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </>
            ) : (
              <>
                <span>Open in LLM</span>
                <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </>
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="absolute right-0 top-full z-50 mt-1 w-64 rounded-lg bg-[hsl(var(--background-base))] p-1 shadow-lg border border-[hsl(var(--border-primary))]">
          <div className="overflow-hidden rounded-md">
            <a 
              href={getClaudeUrl()}
              target="_blank"
              rel="noopener noreferrer" 
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--background-secondary))] no-underline"
              onClick={() => setIsOpen(false)}
            >
              <span className="flex h-5 w-5 items-center justify-center">
                {mounted && (
                  <Image 
                    src={(theme === 'dark' || resolvedTheme === 'dark') ? '/icons/claude-dark.svg' : '/icons/claude-light.svg'} 
                    alt="Claude Logo" 
                    width={20} 
                    height={20}
                  />
                )}
              </span>
              <div className="flex flex-col">
                <span>Ask Claude</span>
                <span className="text-xs text-[hsl(var(--text-tertiary))]">Open this page in Claude</span>
              </div>
              <ExternalLink size={14} className="ml-auto opacity-70" />
            </a>
            
            <a 
              href={getChatGPTUrl()}
              target="_blank"
              rel="noopener noreferrer" 
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--background-secondary))] no-underline"
              onClick={() => setIsOpen(false)}
            >
              <span className="flex h-5 w-5 items-center justify-center">
                {mounted && (
                  <Image 
                    src={(theme === 'dark' || resolvedTheme === 'dark') ? '/icons/chatgpt-dark.svg' : '/icons/chatgpt-light.svg'} 
                    alt="ChatGPT Logo" 
                    width={20} 
                    height={20}
                  />
                )}
              </span>
              <div className="flex flex-col">
                <span>Ask ChatGPT</span>
                <span className="text-xs text-[hsl(var(--text-tertiary))]">Open this page in ChatGPT</span>
              </div>
              <ExternalLink size={14} className="ml-auto opacity-70" />
            </a>

            <button 
              onClick={copyMarkdown}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--background-secondary))]"
            >
              <span className="flex h-5 w-5 items-center justify-center">
                <Copy size={16} />
              </span>
              <div className="flex flex-col text-left">
                <span>Copy as markdown</span>
                <span className="text-xs text-[hsl(var(--text-tertiary))]">Copy page as plaintext</span>
              </div>
              <ExternalLink size={14} className="ml-auto opacity-0" />
            </button>
            
            <a 
              href={mounted ? (isIndexPage ? `${window.location.origin}/api/md/docs/index` : markdownUrl) : '#'}
              target="_blank"
              rel="noopener noreferrer" 
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--background-secondary))] no-underline"
              onClick={() => setIsOpen(false)}
            >
              <span className="flex h-5 w-5 items-center justify-center">
                <FileText size={16} />
              </span>
              <div className="flex flex-col">
                <span>Open in markdown</span>
                <span className="text-xs text-[hsl(var(--text-tertiary))]">Open this page in plaintext</span>
              </div>
              <ExternalLink size={14} className="ml-auto opacity-70" />
            </a>

            <div className="mt-2 px-3 py-2 border-t border-[hsl(var(--border-primary))]">
              <div className="grid grid-cols-2 gap-2">
                <a 
                  href="/llms.txt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex justify-center items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-md text-[hsl(var(--text-primary))] bg-[hsl(var(--background-secondary))] hover:bg-[hsl(var(--background-primary))] no-underline border border-[hsl(var(--border-primary))] transition-colors"
                >
                  <span>llms.txt</span>
                </a>
                <a 
                  href="/llms-full.txt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex justify-center items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-md text-[hsl(var(--text-primary))] bg-[hsl(var(--background-secondary))] hover:bg-[hsl(var(--background-primary))] no-underline border border-[hsl(var(--border-primary))] transition-colors"
                >
                  <span>llms-full.txt</span>
                </a>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
