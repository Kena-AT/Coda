import React from 'react';

interface HighlightTextProps {
  text: string;
  query: string;
  className?: string;
}

/**
 * Highlights substrings of `text` that match `query` (case-insensitive).
 * Used to surface fuzzy-search hits inside snippet list rows.
 */
export const HighlightText: React.FC<HighlightTextProps> = ({ text, query, className }) => {
  // Only highlight keyword terms, not filters (lang:, tag:, etc)
  const escapedTerms = query.split(/\s+/)
    .filter(t => !t.includes(':'))
    .filter(t => t.trim().length > 0)
    .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  if (escapedTerms.length === 0) {
    return <span className={className}>{text}</span>;
  }

  const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
  const safeText = text || '';
  const parts = safeText.split(regex);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-[#e60000] text-white rounded-none px-0 py-0 not-italic"
            style={{ background: '#e60000', color: '#fff' }}
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
};
