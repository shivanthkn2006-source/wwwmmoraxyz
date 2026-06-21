import React, { useState } from 'react';
import { useZoeIntelligence } from '@/hooks/useZoeIntelligence';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Target, Sparkles, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export const ZoeGoalCreator = () => {
  const { createGoal } = useZoeIntelligence();
  const [isCreating, setIsCreating] = useState(false);
  
  const [goalData, setGoalData] = useState({
    goal_description: '',
    goal_category: 'personal',
    target_date: '',
    priority: 'medium'
  });

  const handleCreate = async () => {
    if (!goalData.goal_description.trim()) {
      toast.error('Please describe your goal');
      return;
    }

    setIsCreating(true);
    await createGoal(goalData);
    setIsCreating(false);
    
    // Reset form
    setGoalData({
      goal_description: '',
      goal_category: 'personal',
      target_date: '',
      priority: 'medium'
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glassmorphic p-6 rounded-xl border border-border/50"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/20">
          <Target className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Create New Goal</h3>
          <p className="text-xs text-muted-foreground">Zoe will help you achieve it</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="goal-description" className="text-sm font-medium text-foreground">
            Goal Description *
          </Label>
          <Textarea
            id="goal-description"
            placeholder="E.g., Build a professional network in AI field"
            value={goalData.goal_description}
            onChange={(e) => setGoalData(prev => ({ ...prev, goal_description: e.target.value }))}
            className="mt-1 min-h-[80px] glassmorphic"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="goal-category" className="text-sm font-medium text-foreground">
              Category
            </Label>
            <Select 
              value={goalData.goal_category} 
              onValueChange={(value) => setGoalData(prev => ({ ...prev, goal_category: value }))}
            >
              <SelectTrigger id="goal-category" className="mt-1 glassmorphic">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="social">Social</SelectItem>
                <SelectItem value="creative">Creative</SelectItem>
                <SelectItem value="health">Health</SelectItem>
                <SelectItem value="learning">Learning</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="goal-priority" className="text-sm font-medium text-foreground">
              Priority
            </Label>
            <Select 
              value={goalData.priority} 
              onValueChange={(value) => setGoalData(prev => ({ ...prev, priority: value }))}
            >
              <SelectTrigger id="goal-priority" className="mt-1 glassmorphic">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="target-date" className="text-sm font-medium text-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Target Date (Optional)
          </Label>
          <Input
            id="target-date"
            type="date"
            value={goalData.target_date}
            onChange={(e) => setGoalData(prev => ({ ...prev, target_date: e.target.value }))}
            className="mt-1 glassmorphic"
          />
        </div>

        <Button 
          onClick={handleCreate}
          disabled={isCreating || !goalData.goal_description.trim()}
          className="w-full"
        >
          {isCreating ? (
            <>Creating Goal...</>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Create Goal with Zoe
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Zoe will proactively track your progress and provide suggestions
        </p>
      </div>
    </motion.div>
  );
};
