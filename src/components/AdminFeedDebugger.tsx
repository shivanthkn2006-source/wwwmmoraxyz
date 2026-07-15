import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Bug } from 'lucide-react';

export interface FeedDebugEntry {
  step: string;
  query?: string;
  durationMs?: number;
  rowCount?: number;
  errorCode?: string;
  errorMessage?: string;
  rlsBlocked?: boolean;
  mediaLoadMs?: number;
  postId?: string;
  mediaUrl?: string | null;
  posterUrl?: string | null;
  mediaType?: string | null;
  decodeStatus?: string;
  timestamp: string;
}

interface Props {
  entries: FeedDebugEntry[];
  isAdmin: boolean;
}

const AdminFeedDebugger: React.FC<Props> = ({ entries, isAdmin }) => {
  const [open, setOpen] = useState(false);
  if (!isAdmin) return null;

  return (
    <Card className="mb-3 border-amber-500/40 bg-amber-500/5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-2 text-xs font-medium"
      >
        <span className="flex items-center gap-2">
          <Bug className="h-3 w-3" /> Admin Feed Debugger
          <Badge variant="outline" className="text-[10px]">{entries.length}</Badge>
        </span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {open && (
        <div className="px-2 pb-2 space-y-1 max-h-80 overflow-y-auto">
          {entries.length === 0 && <div className="text-xs opacity-60">No debug events yet.</div>}
          {entries.map((e, i) => (
            <div key={i} className="text-[11px] font-mono border-l-2 border-amber-400/50 pl-2 py-1">
              <div className="flex justify-between">
                <span className="font-semibold">{e.step}</span>
                <span className="opacity-60">{new Date(e.timestamp).toLocaleTimeString()}</span>
              </div>
              {e.query && <div className="opacity-80 break-all">{e.query}</div>}
              {e.postId && <div className="opacity-80 break-all">post:{e.postId}</div>}
              <div className="opacity-70 flex gap-2 flex-wrap">
                {typeof e.durationMs === 'number' && <span>{e.durationMs}ms</span>}
                {typeof e.rowCount === 'number' && <span>{e.rowCount} rows</span>}
                {typeof e.mediaLoadMs === 'number' && <span>media:{e.mediaLoadMs}ms</span>}
                {e.mediaType && <span>{e.mediaType}</span>}
                {e.decodeStatus && <span>{e.decodeStatus}</span>}
                {e.rlsBlocked && <span className="text-red-500">RLS BLOCKED</span>}
                {e.errorCode && <span className="text-red-500">{e.errorCode}</span>}
              </div>
              {e.mediaUrl && <a href={e.mediaUrl} target="_blank" rel="noreferrer" className="block break-all text-primary">media</a>}
              {e.posterUrl && <a href={e.posterUrl} target="_blank" rel="noreferrer" className="block break-all text-primary">poster</a>}
              {e.errorMessage && <div className="text-red-500">{e.errorMessage}</div>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default AdminFeedDebugger;
