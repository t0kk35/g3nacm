import React, { useMemo, useRef } from 'react';

type MarkdownProps = {
  content: string;
}

export function Markdown({ content }: MarkdownProps) {
  // A simple cache to store computed HTML for given markdown strings.
  const cacheRef = useRef(new Map<string, string>());

  // Helper to escape HTML special characters inside code blocks and inline code.
  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  // The actual markdown-to-HTML conversion function.
  const renderMarkdown = (markdown: string): string => {
    let html = markdown;

    // --- Code Blocks ---
    // Matches triple-backtick code blocks, preserving newlines.
    html = html.replace(/```([\s\S]*?)```/g, (_, code) => {
      return `<pre><code>${escapeHtml(code)}</code></pre>`;
    });

    // --- Unordered Lists ---
    // Matches one or more lines starting with '-', '*', or '+' and converts them to list items.
    html = html.replace(/((?:^[-*+]\s+.*(?:\n|$))+)/gm, (match) => {
      const items = match
        .split(/\n/)
        .filter((line) => /^[-*+]\s+/.test(line))
        .map((line) => `<li>${line.replace(/^[-*+]\s+/, '')}</li>`)
        .join('\n');
      return `<ul>\n${items}\n</ul>`;
    });

    // --- Ordered Lists ---
    // Matches one or more lines starting with numbers followed by '.' and converts them to list items.
    html = html.replace(/((?:^\d+\.\s+.*(?:\n|$))+)/gm, (match) => {
      const items = match
        .split(/\n/)
        .filter((line) => /^\d+\.\s+/.test(line))
        .map((line) => `<li>${line.replace(/^\d+\.\s+/, '')}</li>`)
        .join('\n');
      return `<ol>\n${items}\n</ol>`;
    });

    // --- Headings ---
    // Convert markdown headings (#, ##, …, ######) to HTML headings.
    html = html.replace(/^######\s+(.*)$/gm, '<h6>$1</h6>');
    html = html.replace(/^#####\s+(.*)$/gm, '<h5>$1</h5>');
    html = html.replace(/^####\s+(.*)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s+(.*)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.*)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.*)$/gm, '<h1>$1</h1>');

    // --- Inline Code ---
    // Matches inline code delimited by single backticks.
    html = html.replace(/`([^`\n]+)`/g, (_, code) => {
      return `<code>${escapeHtml(code)}</code>`;
    });

    // --- Bold Text ---
    // Supports **bold** or __bold__
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // --- Italic Text ---
    // Supports *italic* or _italic_
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');

    // --- Links ---
    // Matches [link text](https://example.com)
    html = html.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    // --- Paragraphs ---
    // Split text on two or more newlines and wrap blocks that aren’t already block-level HTML.
    html = html
      .split(/\n{2,}/)
      .map((block) => {
        if (/^\s*(<(h[1-6]|ul|ol|pre|blockquote|p|code))/.test(block)) {
          return block;
        }
        return `<p>${block}</p>`;
      })
      .join('');

    return html;
  };

  // Cache and compute the HTML conversion only when the content changes.
  const htmlContent = useMemo(() => {
    if (cacheRef.current.has(content)) {
      return cacheRef.current.get(content)!;
    }
    const computed = renderMarkdown(content);
    cacheRef.current.set(content, computed);
    return computed;
  }, [content]);

  return (
    /* Return a div, with the correct styling, otherwise tailwind pre-flight takes over and removes all list stuff */
    <div
      className="markdown-content [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:my-2 [&_li]:ml-1 [&_li]:my-1 [&_p]:my-2 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:my-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:my-2 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:my-2 [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:my-2 [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_code]:text-sm [&_a]:text-blue-500 [&_a]:underline"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};