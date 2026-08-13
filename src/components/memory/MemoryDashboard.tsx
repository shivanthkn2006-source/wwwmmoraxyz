import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, Search, Brain, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MemoryService,
  normaliseAtoms,
  extractPersonaText,
  type MemoryAtom,
  type PersonaPayload,
} from '@/services/memoryService';

interface MemoryDashboardProps {
  userId: string;
  refreshToken?: number;
}

export const MemoryDashboard = ({ userId, refreshToken = 0 }: MemoryDashboardProps) => {
  const [persona, setPersona] = useState<PersonaPayload | null>(null);
  const [atoms, setAtoms] = useState<MemoryAtom[]>([]);
  const [query, setQuery] = useState('');
  const [loadingPersona, setLoadingPersona] = useState(false);
  const [loadingAtoms, setLoadingAtoms] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPersona = useCallback(async () => {
    setLoadingPersona(true);
    const res = await MemoryService.getPersona();
    if (res.success) {
      setPersona(res.data ?? null);
      setError(null);
    } else {
      setError(res.error ?? 'Failed to load persona');
    }
    setLoadingPersona(false);
  }, []);

  const loadAtoms = useCallback(async (q: string) => {
    setLoadingAtoms(true);
    const res = await MemoryService.searchMemories(q || '*', 10);
    if (res.success) {
      setAtoms(normaliseAtoms(res.data));
      setError(null);
    } else {
      setError(res.error ?? 'Failed to load memory atoms');
    }
    setLoadingAtoms(false);
  }, []);

  useEffect(() => {
    loadPersona();
    loadAtoms('');
  }, [loadPersona, loadAtoms, refreshToken, userId]);

  const personaText = extractPersonaText(persona);


  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4 text-primary" />
            L3 Persona
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={loadPersona} disabled={loadingPersona}>
            {loadingPersona ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </CardHeader>
        <CardContent>
          {personaText ? (
            <ScrollArea className="h-40">
              <pre className="whitespace-pre-wrap break-words font-sans text-sm text-muted-foreground">
                {personaText}
              </pre>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground">
              No persona distilled yet. Send a few messages so the gateway can build L1 → L3.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="flex-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">L1 Atoms &amp; L2 Scenarios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              loadAtoms(query);
            }}
          >
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search facts and preferences…"
              aria-label="Search memory atoms"
            />
            <Button type="submit" size="icon" disabled={loadingAtoms}>
              {loadingAtoms ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </form>

          <ScrollArea className="h-64 pr-3">
            {atoms.length === 0 ? (
              <p className="text-sm text-muted-foreground">No atoms retrieved.</p>
            ) : (
              <ul className="space-y-2">
                {atoms.map((atom, i) => (
                  <li
                    key={atom.id ?? i}
                    className="rounded-md border border-border bg-muted/40 p-2 text-sm"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      {atom.type && (
                        <Badge variant="secondary" className="text-[10px]">
                          {atom.type}
                        </Badge>
                      )}
                      {typeof atom.score === 'number' && (
                        <span className="text-[10px] text-muted-foreground">
                          score {atom.score.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <p className="break-words text-muted-foreground">{atom.content}</p>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default MemoryDashboard;
