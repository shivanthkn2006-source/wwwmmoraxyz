import { memo, useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp, Quote, Globe } from 'lucide-react';

export interface Citation {
  id: number;
  url: string;
  title: string;
  snippet?: string;
  domain: string;
}

interface CitationPanelProps {
  citations: Citation[];
  isOpen?: boolean;
  onToggle?: () => void;
}

/**
 * PROTOCOL TRUTH SCRIBE: Citation Panel
 * Displays clickable source references like Perplexity Pro
 * Part of the "Deep Grounding" upgrade for trust & verification
 */
export const CitationPanel = memo(function CitationPanel({
  citations,
  isOpen = false,
  onToggle,
}: CitationPanelProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (citations.length === 0) return null;

  return (
    <div className="mt-4">
      {/* Toggle Header */}
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Quote className="w-3 h-3" />
        <span>{citations.length} Source{citations.length > 1 ? 's' : ''}</span>
        {isOpen ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>

      {/* Citation List */}
      {isOpen && (
        <div className="mt-3 space-y-2 animate-fade-in">
          {citations.map((citation) => (
            <div
              key={citation.id}
              className="group relative bg-background/30 backdrop-blur-sm rounded-lg border border-border/30 overflow-hidden transition-all hover:border-primary/30"
            >
              {/* Citation Header */}
              <a
                href={citation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 hover:bg-accent/10 transition-colors"
              >
                {/* Citation Number Badge */}
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium">
                  {citation.id}
                </span>

                <div className="flex-1 min-w-0">
                  {/* Title */}
                  <h4 className="text-sm font-medium text-foreground/90 truncate group-hover:text-primary transition-colors">
                    {citation.title}
                  </h4>
                  
                  {/* Domain with icon */}
                  <div className="flex items-center gap-1 mt-0.5">
                    <Globe className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground truncate">
                      {citation.domain}
                    </span>
                  </div>

                  {/* Snippet (expandable) */}
                  {citation.snippet && (
                    <p 
                      className={`mt-2 text-xs text-muted-foreground/80 ${
                        expandedIndex === citation.id ? '' : 'line-clamp-2'
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        setExpandedIndex(expandedIndex === citation.id ? null : citation.id);
                      }}
                    >
                      "{citation.snippet}"
                    </p>
                  )}
                </div>

                {/* External Link Icon */}
                <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

/**
 * Inline Citation Marker
 * Renders [1], [2], [3] badges that can be clicked to highlight the source
 */
export const CitationMarker = memo(function CitationMarker({
  id,
  onClick,
}: {
  id: number;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/20 text-primary text-[10px] font-medium hover:bg-primary/30 transition-colors mx-0.5 align-super"
      title={`View source [${id}]`}
    >
      {id}
    </button>
  );
});

/**
 * Parse response text and replace [1], [2] markers with clickable components
 * Returns JSX with inline citation badges
 */
export function parseContentWithCitations(
  content: string,
  onCitationClick?: (id: number) => void
): React.ReactNode {
  const parts = content.split(/(\[\d+\])/g);
  
  return parts.map((part, index) => {
    const match = part.match(/\[(\d+)\]/);
    if (match) {
      const citationId = parseInt(match[1], 10);
      return (
        <CitationMarker
          key={`citation-marker-${index}`}
          id={citationId}
          onClick={() => onCitationClick?.(citationId)}
        />
      );
    }
    // Return text as a span with key for proper React reconciliation
    return <span key={`text-${index}`}>{part}</span>;
  });
}

export default CitationPanel;
