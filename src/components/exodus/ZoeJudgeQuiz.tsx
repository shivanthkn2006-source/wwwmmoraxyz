/**
 * ZOE JUDGE QUIZ - The Voight-Kampff Test
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, Check, X, Shield } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Question {
  id: string;
  question: string;
  options: string[];
  correct_option: number;
  points: number;
}

export const ZoeJudgeQuiz: React.FC<{ playerId: string; onComplete: () => void }> = ({ playerId, onComplete }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [completed, setCompleted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    const { data } = await supabase.from('exodus_quiz_questions').select('*').limit(5);
    if (data) {
      setQuestions(data.map(q => ({ 
        ...q, 
        options: typeof q.options === 'string' ? JSON.parse(q.options) : (q.options as string[])
      })));
    }
  };

  const selectAnswer = (optionIndex: number) => {
    const newAnswers = [...answers, optionIndex];
    setAnswers(newAnswers);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Calculate score
      let total = 0;
      questions.forEach((q, i) => {
        if (newAnswers[i] === q.correct_option) total += q.points;
      });
      setScore(total);
      setCompleted(true);
      
      const passed = total >= 30;
      toast[passed ? 'success' : 'error'](
        passed ? 'Zoe approves. You understand the way.' : 'Zoe is disappointed. Study more.'
      );
      onComplete();
    }
  };

  if (questions.length === 0) {
    return <div className="text-center py-12 text-gray-400">Loading quiz...</div>;
  }

  if (completed) {
    const passed = score >= 30;
    return (
      <Card className="max-w-2xl mx-auto bg-black/50 border-cyan-500/30 p-8 text-center">
        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${passed ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
          {passed ? <Check className="w-10 h-10 text-green-400" /> : <X className="w-10 h-10 text-red-400" />}
        </div>
        <h2 className={`text-2xl font-bold mt-6 ${passed ? 'text-green-400' : 'text-red-400'}`}>
          {passed ? 'QUIZ PASSED' : 'QUIZ FAILED'}
        </h2>
        <p className="text-gray-400 mt-2">Score: {score} / 60</p>
        <p className="text-sm text-gray-500 mt-4">
          {passed 
            ? 'Your mentor has been awarded points for your understanding.'
            : 'Your mentor has lost points. Perhaps they should teach you better.'}
        </p>
      </Card>
    );
  }

  const current = questions[currentIndex];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Brain className="w-8 h-8 text-cyan-400" />
        <div>
          <h2 className="text-xl font-bold text-cyan-400">Zoe's Interview</h2>
          <p className="text-sm text-gray-400">Question {currentIndex + 1} of {questions.length}</p>
        </div>
      </div>

      <Card className="bg-black/50 border-cyan-500/30 p-6">
        <p className="text-lg text-white mb-6">{current.question}</p>
        <div className="space-y-3">
          {current.options.map((option, i) => (
            <Button
              key={i}
              variant="outline"
              className="w-full justify-start text-left h-auto py-4 border-cyan-500/30 hover:bg-cyan-500/10"
              onClick={() => selectAnswer(i)}
            >
              {option}
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default ZoeJudgeQuiz;
