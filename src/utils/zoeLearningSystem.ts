import { supabase } from '@/integrations/supabase/client';

interface LearningPreferences {
  learning_enabled: boolean;
  command_preferences: Record<string, any>;
  response_patterns: Record<string, any>;
  interaction_stats: Record<string, any>;
}

// Colloquial speech patterns for more natural interactions
const colloquialPatterns = {
  greetings: [
    "Hey there!", "What's up?", "Hey!", "Yo!", "Hey hey!",
    "Heya!", "Sup?", "Hi there!", "Hello!", "Hey friend!"
  ],
  acknowledgments: [
    "Got it!", "Cool cool!", "Awesome!", "Nice!", "Sweet!",
    "Okay!", "Alright!", "Perfect!", "Love it!", "Dope!",
    "For sure!", "Bet!", "Say less!", "I feel you!", "Facts!"
  ],
  transitions: [
    "So...", "Anyway...", "By the way...", "Oh, and...",
    "Speaking of which...", "Real quick...", "One more thing...",
    "Before I forget...", "Quick question..."
  ],
  empathy: [
    "I get it.", "I feel you on that.", "That makes sense.",
    "I understand.", "Fair enough.", "Totally get what you mean.",
    "I hear you.", "That's valid.", "Real talk.", "No cap!"
  ],
  encouragement: [
    "You got this!", "Keep it up!", "That's the spirit!",
    "You're doing great!", "Proud of you!", "Nice work!",
    "Way to go!", "Killing it!", "Let's go!", "Yessss!"
  ],
  humor: [
    "😄", "Haha!", "Lol!", "That's funny!", "Good one!",
    "You're hilarious!", "I see what you did there!", "Nice!",
    "😂", "That made me chuckle!"
  ]
};

export class ZoeLearningSystem {
  private userId: string;
  private preferences: LearningPreferences | null = null;

  constructor(userId: string) {
    this.userId = userId;
  }

  // Get colloquial response based on context
  getColloquialResponse(type: keyof typeof colloquialPatterns): string {
    const options = colloquialPatterns[type];
    return options[Math.floor(Math.random() * options.length)];
  }

  // Build a casual sentence with natural flow
  buildCasualSentence(parts: { type: keyof typeof colloquialPatterns, custom?: string }[]): string {
    return parts
      .map(part => part.custom || this.getColloquialResponse(part.type))
      .join(' ');
  }

  // Initialize learning preferences for user
  async initialize(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('zoe_learning_preferences')
        .select('*')
        .eq('user_id', this.userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading learning preferences:', error);
        return;
      }

      if (!data) {
        // Create default preferences using UPSERT to handle race conditions
        const { data: newData, error: insertError } = await supabase
          .from('zoe_learning_preferences')
          .upsert({
            user_id: this.userId,
            learning_enabled: true,
            command_preferences: {},
            response_patterns: {},
            interaction_stats: {
              total_commands: 0,
              successful_commands: 0,
              failed_commands: 0,
              favorite_commands: [],
              preferred_times: [],
            },
          }, { onConflict: 'user_id' })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating learning preferences:', insertError);
          return;
        }

        this.preferences = newData as LearningPreferences;
      } else {
        this.preferences = data as LearningPreferences;
      }
    } catch (error) {
      console.error('Error initializing learning system:', error);
    }
  }

  // Record command execution and learn from it
  async recordCommand(command: string, success: boolean, metadata?: any): Promise<void> {
    if (!this.preferences?.learning_enabled) return;

    try {
      await this.initialize();
      if (!this.preferences) return;

      // Update command preferences
      const cmdKey = command.toLowerCase().split(' ').slice(0, 3).join('_');
      const currentPref = this.preferences.command_preferences[cmdKey] || {
        count: 0,
        success_count: 0,
        last_used: null,
        context: [],
      };

      currentPref.count++;
      if (success) currentPref.success_count++;
      currentPref.last_used = new Date().toISOString();

      if (metadata?.context) {
        currentPref.context = [...(currentPref.context || []), metadata.context].slice(-5);
      }

      this.preferences.command_preferences[cmdKey] = currentPref;

      // Update interaction stats
      const stats = this.preferences.interaction_stats as any;
      stats.total_commands = (stats.total_commands || 0) + 1;
      if (success) {
        stats.successful_commands = (stats.successful_commands || 0) + 1;
      } else {
        stats.failed_commands = (stats.failed_commands || 0) + 1;
      }

      // Track time patterns
      const hour = new Date().getHours();
      const timeSlot = `${hour}-${hour + 1}`;
      const preferredTimes = stats.preferred_times || [];
      const timeIndex = preferredTimes.findIndex((t: any) => t.slot === timeSlot);
      
      if (timeIndex >= 0) {
        preferredTimes[timeIndex].count++;
      } else {
        preferredTimes.push({ slot: timeSlot, count: 1 });
      }
      
      stats.preferred_times = preferredTimes.sort((a: any, b: any) => b.count - a.count).slice(0, 10);

      // Update favorite commands
      const commandCounts = Object.entries(this.preferences.command_preferences)
        .map(([cmd, pref]: [string, any]) => ({ command: cmd, count: pref.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      stats.favorite_commands = commandCounts;

      // Save to database
      const { error } = await supabase
        .from('zoe_learning_preferences')
        .update({
          command_preferences: this.preferences.command_preferences,
          interaction_stats: this.preferences.interaction_stats,
          last_learning_update: new Date().toISOString(),
        })
        .eq('user_id', this.userId);

      if (error) {
        console.error('Error updating learning preferences:', error);
      }
    } catch (error) {
      console.error('Error recording command:', error);
    }
  }

  // Get personalized suggestions based on learning
  async getPersonalizedSuggestions(): Promise<string[]> {
    await this.initialize();
    if (!this.preferences?.learning_enabled) return [];

    const suggestions: string[] = [];
    const stats = this.preferences.interaction_stats as any;

    // Suggest commands they haven't tried recently
    if (stats.favorite_commands?.length > 0) {
      const topCommand = stats.favorite_commands[0].command.replace(/_/g, ' ');
      suggestions.push(`Try: "${topCommand}" - one of your favorites`);
    }

    // Time-based suggestions
    const currentHour = new Date().getHours();
    const preferredTimes = stats.preferred_times || [];
    const isPreferredTime = preferredTimes.some((t: any) => {
      const [start] = t.slot.split('-').map(Number);
      return currentHour >= start && currentHour < start + 1;
    });

    if (isPreferredTime) {
      suggestions.push('This is your peak usage time! Lisa is ready for complex commands.');
    }

    // Success rate suggestions
    const successRate = stats.total_commands > 0
      ? (stats.successful_commands / stats.total_commands) * 100
      : 0;

    if (successRate < 70) {
      suggestions.push('Tip: Try speaking more clearly or reducing background noise');
    }

    return suggestions.slice(0, 3);
  }

  // Get adapted response based on user patterns
  async getAdaptedResponse(command: string): Promise<string | null> {
    await this.initialize();
    if (!this.preferences?.learning_enabled) return null;

    const cmdKey = command.toLowerCase().split(' ').slice(0, 3).join('_');
    const pref = this.preferences.command_preferences[cmdKey];

    if (!pref) return null;

    // Adapt response based on usage patterns
    if (pref.count > 10) {
      return 'quick'; // User knows this command well, give quick response
    } else if (pref.count > 5) {
      return 'normal'; // Regular response
    } else {
      return 'detailed'; // New command, give detailed response
    }
  }

  // Get learning statistics
  async getStats(): Promise<any> {
    await this.initialize();
    if (!this.preferences) return null;

    return {
      learningEnabled: this.preferences.learning_enabled,
      totalCommands: (this.preferences.interaction_stats as any).total_commands || 0,
      successRate: this.calculateSuccessRate(),
      favoriteCommands: (this.preferences.interaction_stats as any).favorite_commands || [],
      preferredTimes: (this.preferences.interaction_stats as any).preferred_times || [],
    };
  }

  private calculateSuccessRate(): number {
    if (!this.preferences) return 0;
    const stats = this.preferences.interaction_stats as any;
    const total = stats.total_commands || 0;
    const successful = stats.successful_commands || 0;
    return total > 0 ? Math.round((successful / total) * 100) : 0;
  }

  // Toggle learning
  async toggleLearning(enabled: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('zoe_learning_preferences')
        .update({ learning_enabled: enabled })
        .eq('user_id', this.userId);

      if (error) throw error;

      if (this.preferences) {
        this.preferences.learning_enabled = enabled;
      }
    } catch (error) {
      console.error('Error toggling learning:', error);
      throw error;
    }
  }
}
