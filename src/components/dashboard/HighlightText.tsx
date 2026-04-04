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
  if (!query.trim()) {
    return <span className={className}>{text}</span>;
  }

  // Escape special regex characters in the query
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

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
