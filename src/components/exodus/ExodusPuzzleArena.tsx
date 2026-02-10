/**
 * EXODUS PUZZLE ARENA - Scavenger Hunt
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Unlock, Check, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Puzzle {
  id: string;
  stage: number;
  title: string;
  riddle: string;
  hint: string;
  solvers_count: number;
}

export const ExodusPuzzleArena: React.FC<{ playerId?: string }> = ({ playerId }) => {
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [solved, setSolved] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPuzzles();
  }, []);

  const fetchPuzzles = async () => {
    const { data } = await supabase.from('exodus_puzzles').select('*').order('stage');
    setPuzzles(data || []);
  };

  const submitAnswer = async (puzzleId: string) => {
    const answer = answers[puzzleId]?.toLowerCase().trim();
    if (!answer) return;

    // Simple client-side check (real validation should be server-side)
    if (answer === 'ai' || answer === 'artificial intelligence' || answer === 'zoe') {
      setSolved(prev => new Set([...prev, puzzleId]));
      toast.success('Correct! The gate opens...');
    } else {
      toast.error('Incorrect. The gate remains sealed.');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-cyan-400">The Scavenger Hunt</h2>
      <div className="grid gap-6">
        {puzzles.map((puzzle) => (
          <Card key={puzzle.id} className="bg-black/50 border-cyan-500/30 p-6">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-full ${solved.has(puzzle.id) ? 'bg-green-500/20' : 'bg-cyan-500/20'}`}>
                {solved.has(puzzle.id) ? <Unlock className="w-6 h-6 text-green-400" /> : <Lock className="w-6 h-6 text-cyan-400" />}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-white">Stage {puzzle.stage}: {puzzle.title}</h3>
                <p className="text-gray-400 mt-2 italic">"{puzzle.riddle}"</p>
                {!solved.has(puzzle.id) && (
                  <div className="mt-4 flex gap-2">
                    <input
                      type="text"
                      value={answers[puzzle.id] || ''}
                      onChange={(e) => setAnswers(prev => ({ ...prev, [puzzle.id]: e.target.value }))}
                      placeholder="Enter your answer..."
                      className="flex-1 bg-gray-900 border border-cyan-500/30 rounded px-3 py-2 text-white"
                    />
                    <Button onClick={() => submitAnswer(puzzle.id)} className="bg-cyan-500">Submit</Button>
                  </div>
                )}
                {solved.has(puzzle.id) && (
                  <div className="mt-4 text-green-400 flex items-center gap-2">
                    <Check className="w-5 h-5" /> Solved!
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ExodusPuzzleArena;
