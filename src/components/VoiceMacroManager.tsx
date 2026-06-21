import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Plus, Trash2, Edit2, Save, X, PlayCircle, Download, Upload, GitBranch, Clock, FolderOpen, Library, Variable } from 'lucide-react';
import { toast } from 'sonner';
import { MACRO_TEMPLATES, MACRO_CATEGORIES } from '@/data/macroTemplates';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface VoiceMacro {
  id: string;
  macro_name: string;
  trigger_phrase: string;
  commands: string[];
  description?: string;
  enabled: boolean;
  execution_count: number;
  conditions?: MacroCondition[];
  schedule_enabled?: boolean;
  schedule_days?: string[];
  schedule_time?: string;
  category?: string;
  variables?: MacroVariable[];
}

interface MacroVariable {
  name: string;
  defaultValue: string;
  description: string;
}

interface MacroCondition {
  type: 'weather' | 'time' | 'day';
  condition: string;
  trueCommands: string[];
  falseCommands: string[];
}

export const VoiceMacroManager = () => {
  const { user } = useAuth();
  const [macros, setMacros] = useState<VoiceMacro[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMacro, setEditingMacro] = useState<VoiceMacro | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const [formData, setFormData] = useState({
    macro_name: '',
    trigger_phrase: '',
    commands: '',
    description: '',
    enabled: true,
    hasCondition: false,
    conditionType: 'weather' as 'weather' | 'time' | 'day',
    conditionValue: '',
    trueCommands: '',
    falseCommands: '',
    category: 'general',
    schedule_enabled: false,
    schedule_days: [] as string[],
    schedule_time: '09:00',
    variables: [] as MacroVariable[],
    variableName: '',
    variableDefault: '',
    variableDescription: '',
  });

  useEffect(() => {
    if (user) {
      loadMacros();
    }
  }, [user]);

  const loadMacros = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('voice_macros')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMacros((data || []).map(m => ({
        ...m,
        commands: Array.isArray(m.commands) ? m.commands.map(String) : [],
        conditions: Array.isArray(m.conditions) ? m.conditions as unknown as MacroCondition[] : [],
        variables: Array.isArray(m.variables) ? m.variables as unknown as MacroVariable[] : [],
        schedule_days: Array.isArray(m.schedule_days) ? m.schedule_days.map(String) : []
      })) as VoiceMacro[]);
    } catch (error: any) {
      console.error('Error loading macros:', error);
      toast.error('Failed to load voice macros');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMacro = async () => {
    try {
      if (!formData.macro_name || !formData.trigger_phrase) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Handle conditional vs regular commands
      let commandsArray: string[] = [];
      let conditionsArray: MacroCondition[] = [];

      if (formData.hasCondition) {
        if (!formData.conditionValue || !formData.trueCommands) {
          toast.error('Please complete all condition fields');
          return;
        }

        const trueCommandsArray = formData.trueCommands
          .split('\n')
          .map(c => c.trim())
          .filter(c => c.length > 0);

        const falseCommandsArray = formData.falseCommands
          .split('\n')
          .map(c => c.trim())
          .filter(c => c.length > 0);

        conditionsArray = [{
          type: formData.conditionType,
          condition: formData.conditionValue,
          trueCommands: trueCommandsArray,
          falseCommands: falseCommandsArray,
        }];
      } else {
        if (!formData.commands) {
          toast.error('Please add at least one command');
          return;
        }

        commandsArray = formData.commands
          .split('\n')
          .map(c => c.trim())
          .filter(c => c.length > 0);

        if (commandsArray.length === 0) {
          toast.error('Please add at least one command');
          return;
        }
      }

      const macroData = {
        user_id: user?.id,
        macro_name: formData.macro_name,
        trigger_phrase: formData.trigger_phrase,
        commands: commandsArray,
        description: formData.description || null,
        enabled: formData.enabled,
        conditions: conditionsArray as unknown as any,
        category: formData.category,
        schedule_enabled: formData.schedule_enabled,
        schedule_days: formData.schedule_days as unknown as any,
        schedule_time: formData.schedule_enabled ? formData.schedule_time : null,
        variables: formData.variables as unknown as any,
      };

      if (editingMacro) {
        const { error } = await supabase
          .from('voice_macros')
          .update(macroData)
          .eq('id', editingMacro.id);

        if (error) throw error;
        toast.success('Macro updated successfully');
      } else {
        const { error } = await supabase
          .from('voice_macros')
          .insert(macroData);

        if (error) throw error;
        toast.success('Macro created successfully');
      }

      setIsDialogOpen(false);
      resetForm();
      loadMacros();
    } catch (error: any) {
      console.error('Error saving macro:', error);
      toast.error('Failed to save macro');
    }
  };

  const handleDeleteMacro = async (id: string) => {
    try {
      const { error } = await supabase
        .from('voice_macros')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Macro deleted');
      loadMacros();
    } catch (error: any) {
      console.error('Error deleting macro:', error);
      toast.error('Failed to delete macro');
    }
  };

  const handleToggleMacro = async (id: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('voice_macros')
        .update({ enabled })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Macro ${enabled ? 'enabled' : 'disabled'}`);
      loadMacros();
    } catch (error: any) {
      console.error('Error toggling macro:', error);
      toast.error('Failed to toggle macro');
    }
  };

  const handleEditMacro = (macro: VoiceMacro) => {
    setEditingMacro(macro);
    const firstCondition = macro.conditions && macro.conditions[0];
    setFormData({
      macro_name: macro.macro_name,
      trigger_phrase: macro.trigger_phrase,
      commands: macro.commands.join('\n'),
      description: macro.description || '',
      enabled: macro.enabled,
      hasCondition: !!firstCondition,
      conditionType: firstCondition?.type || 'weather',
      conditionValue: firstCondition?.condition || '',
      trueCommands: firstCondition?.trueCommands.join('\n') || '',
      falseCommands: firstCondition?.falseCommands.join('\n') || '',
      category: macro.category || 'general',
      schedule_enabled: macro.schedule_enabled || false,
      schedule_days: macro.schedule_days || [],
      schedule_time: macro.schedule_time || '09:00',
      variables: macro.variables || [],
      variableName: '',
      variableDefault: '',
      variableDescription: '',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      macro_name: '',
      trigger_phrase: '',
      commands: '',
      description: '',
      enabled: true,
      hasCondition: false,
      conditionType: 'weather',
      conditionValue: '',
      trueCommands: '',
      falseCommands: '',
      category: 'general',
      schedule_enabled: false,
      schedule_days: [],
      schedule_time: '09:00',
      variables: [],
      variableName: '',
      variableDefault: '',
      variableDescription: '',
    });
    setEditingMacro(null);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleAddVariable = () => {
    if (!formData.variableName) {
      toast.error('Please enter a variable name');
      return;
    }

    const newVariable: MacroVariable = {
      name: formData.variableName,
      defaultValue: formData.variableDefault,
      description: formData.variableDescription,
    };

    setFormData({
      ...formData,
      variables: [...formData.variables, newVariable],
      variableName: '',
      variableDefault: '',
      variableDescription: '',
    });
  };

  const handleRemoveVariable = (index: number) => {
    setFormData({
      ...formData,
      variables: formData.variables.filter((_, i) => i !== index),
    });
  };

  const handleApplyTemplate = async (templateId: string) => {
    const template = MACRO_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    try {
      const { error } = await supabase
        .from('voice_macros')
        .insert({
          user_id: user?.id,
          macro_name: template.name,
          trigger_phrase: template.trigger_phrase,
          commands: template.commands,
          description: template.description,
          category: template.category,
          variables: (template.variables || []) as unknown as any,
          enabled: false, // Start disabled for safety
        });

      if (error) throw error;
      toast.success(`Template "${template.name}" added successfully`);
      setIsTemplateDialogOpen(false);
      loadMacros();
    } catch (error) {
      console.error('Error applying template:', error);
      toast.error('Failed to add template');
    }
  };

  const handleToggleScheduleDay = (day: string) => {
    const days = formData.schedule_days.includes(day)
      ? formData.schedule_days.filter(d => d !== day)
      : [...formData.schedule_days, day];
    setFormData({ ...formData, schedule_days: days });
  };

  const filteredMacros = selectedCategory === 'all'
    ? macros
    : macros.filter(m => m.category === selectedCategory);

  const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleExportMacros = () => {
    try {
      const exportData = {
        version: '1.0',
        exported_at: new Date().toISOString(),
        macros: macros.map(m => ({
          macro_name: m.macro_name,
          trigger_phrase: m.trigger_phrase,
          commands: m.commands,
          description: m.description,
          conditions: m.conditions || [],
        })),
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lisa-macros-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success('Macros exported successfully');
    } catch (error) {
      console.error('Error exporting macros:', error);
      toast.error('Failed to export macros');
    }
  };

  const handleImportMacros = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const importData = JSON.parse(content);

          if (!importData.macros || !Array.isArray(importData.macros)) {
            throw new Error('Invalid macro file format');
          }

          let imported = 0;
          for (const macro of importData.macros) {
          const { error } = await supabase
            .from('voice_macros')
            .insert({
              user_id: user?.id,
              macro_name: macro.macro_name,
              trigger_phrase: macro.trigger_phrase,
              commands: macro.commands,
              description: macro.description,
              conditions: (macro.conditions || []) as unknown as any,
              enabled: false, // Import as disabled for safety
            });

            if (!error) imported++;
          }

          if (imported > 0) {
            toast.success(`Imported ${imported} macro${imported > 1 ? 's' : ''} successfully`);
            loadMacros();
          }
        } catch (error) {
          console.error('Error parsing import file:', error);
          toast.error('Invalid macro file format');
        }
      };

      reader.readAsText(file);
      event.target.value = ''; // Reset input
    } catch (error) {
      console.error('Error importing macros:', error);
      toast.error('Failed to import macros');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Voice Command Macros</CardTitle>
            <CardDescription>
              Create custom voice shortcuts that execute multiple commands in sequence
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTemplateDialogOpen(true)}
            >
              <Library className="h-4 w-4 mr-2" />
              Templates
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportMacros} disabled={macros.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <input
              type="file"
              accept=".json"
              onChange={handleImportMacros}
              style={{ display: 'none' }}
              id="macro-import-input"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('macro-import-input')?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Macro
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingMacro ? 'Edit Voice Macro' : 'Create Voice Macro'}
                </DialogTitle>
                <DialogDescription>
                  Define a trigger phrase and the commands to execute
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="macro_name">Macro Name *</Label>
                  <Input
                    id="macro_name"
                    placeholder="e.g., Morning Routine"
                    value={formData.macro_name}
                    onChange={(e) => setFormData({ ...formData, macro_name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trigger_phrase">Trigger Phrase *</Label>
                  <Input
                    id="trigger_phrase"
                    placeholder="e.g., start my day"
                    value={formData.trigger_phrase}
                    onChange={(e) => setFormData({ ...formData, trigger_phrase: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Say this phrase to execute the macro
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MACRO_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.icon} {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 p-4 rounded-lg bg-secondary/20">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="schedule_enabled" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Schedule Auto-Execution
                    </Label>
                    <Switch
                      id="schedule_enabled"
                      checked={formData.schedule_enabled}
                      onCheckedChange={(checked) => setFormData({ ...formData, schedule_enabled: checked })}
                    />
                  </div>

                  {formData.schedule_enabled && (
                    <div className="space-y-4 mt-4 pl-4 border-l-2 border-primary/30">
                      <div className="space-y-2">
                        <Label>Days of Week</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {DAYS_OF_WEEK.map((day) => (
                            <Button
                              key={day}
                              type="button"
                              variant={formData.schedule_days.includes(day.toLowerCase()) ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => handleToggleScheduleDay(day.toLowerCase())}
                            >
                              {day.slice(0, 3)}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="schedule_time">Time</Label>
                        <Input
                          id="schedule_time"
                          type="time"
                          value={formData.schedule_time}
                          onChange={(e) => setFormData({ ...formData, schedule_time: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2 p-4 rounded-lg bg-secondary/20">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Variable className="h-4 w-4" />
                      Variables
                    </Label>
                  </div>
                  
                  {formData.variables.length > 0 && (
                    <div className="space-y-2">
                      {formData.variables.map((variable, index) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded bg-background">
                          <div>
                            <div className="font-medium text-sm">{`{${variable.name}}`}</div>
                            {variable.description && (
                              <div className="text-xs text-muted-foreground">{variable.description}</div>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveVariable(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <Input
                      placeholder="Variable name"
                      value={formData.variableName}
                      onChange={(e) => setFormData({ ...formData, variableName: e.target.value })}
                    />
                    <Input
                      placeholder="Default value"
                      value={formData.variableDefault}
                      onChange={(e) => setFormData({ ...formData, variableDefault: e.target.value })}
                    />
                    <Input
                      placeholder="Description"
                      value={formData.variableDescription}
                      onChange={(e) => setFormData({ ...formData, variableDescription: e.target.value })}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddVariable}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Variable
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Use variables in commands like: "show weather for {'{'} location{'}'}"
                  </p>
                </div>

                <div className="space-y-2 p-4 rounded-lg bg-secondary/20">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="hasCondition"
                      checked={formData.hasCondition}
                      onCheckedChange={(checked) => setFormData({ ...formData, hasCondition: checked })}
                    />
                    <Label htmlFor="hasCondition" className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4" />
                      Add conditional logic (if/then)
                    </Label>
                  </div>
                  
                  {formData.hasCondition && (
                    <div className="space-y-4 mt-4 pl-4 border-l-2 border-primary/30">
                      <div className="space-y-2">
                        <Label>Condition Type</Label>
                        <Select
                          value={formData.conditionType}
                          onValueChange={(value: 'weather' | 'time' | 'day') =>
                            setFormData({ ...formData, conditionType: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weather">Weather</SelectItem>
                            <SelectItem value="time">Time</SelectItem>
                            <SelectItem value="day">Day of Week</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Condition Value</Label>
                        <Input
                          placeholder={
                            formData.conditionType === 'weather' ? 'e.g., raining, sunny' :
                            formData.conditionType === 'time' ? 'e.g., morning, afternoon, evening' :
                            'e.g., Monday, weekend'
                          }
                          value={formData.conditionValue}
                          onChange={(e) => setFormData({ ...formData, conditionValue: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Commands if TRUE (one per line)</Label>
                        <Textarea
                          placeholder="show weather&#10;morning briefing"
                          value={formData.trueCommands}
                          onChange={(e) => setFormData({ ...formData, trueCommands: e.target.value })}
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Commands if FALSE (one per line)</Label>
                        <Textarea
                          placeholder="show calendar&#10;check schedule"
                          value={formData.falseCommands}
                          onChange={(e) => setFormData({ ...formData, falseCommands: e.target.value })}
                          rows={3}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {!formData.hasCondition && (
                  <div className="space-y-2">
                  <Label htmlFor="commands">Commands (one per line) *</Label>
                  <Textarea
                    id="commands"
                    placeholder="show weather&#10;read my briefing&#10;show calendar"
                    value={formData.commands}
                    onChange={(e) => setFormData({ ...formData, commands: e.target.value })}
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    Each command will be executed in order
                  </p>
                </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    placeholder="What does this macro do?"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="enabled"
                    checked={formData.enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                  />
                  <Label htmlFor="enabled">Enable this macro</Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleCloseDialog}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSaveMacro}>
                    <Save className="h-4 w-4 mr-2" />
                    {editingMacro ? 'Update' : 'Create'} Macro
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
            >
              All ({macros.length})
            </Button>
            {MACRO_CATEGORIES.map((cat) => {
              const count = macros.filter(m => m.category === cat.value).length;
              if (count === 0) return null;
              return (
                <Button
                  key={cat.value}
                  variant={selectedCategory === cat.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.value)}
                >
                  {cat.icon} {cat.label} ({count})
                </Button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredMacros.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <PlayCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No voice macros in this category. Create your first macro to get started!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMacros.map((macro) => (
              <Card key={macro.id} className={!macro.enabled ? 'opacity-60' : ''}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{macro.macro_name}</h3>
                        <Badge variant={macro.enabled ? 'default' : 'secondary'}>
                          {macro.enabled ? 'Active' : 'Disabled'}
                        </Badge>
                        <Badge variant="outline">{macro.execution_count} uses</Badge>
                        {macro.category && (
                          <Badge variant="outline">
                            {MACRO_CATEGORIES.find(c => c.value === macro.category)?.icon || '📌'}{' '}
                            {MACRO_CATEGORIES.find(c => c.value === macro.category)?.label || macro.category}
                          </Badge>
                        )}
                        {macro.schedule_enabled && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            Scheduled
                          </Badge>
                        )}
                        {macro.variables && macro.variables.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Variable className="h-3 w-3 mr-1" />
                            {macro.variables.length} vars
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <PlayCircle className="h-4 w-4" />
                        <span className="font-medium">"{macro.trigger_phrase}"</span>
                      </div>

                      {macro.description && (
                        <p className="text-sm text-muted-foreground">{macro.description}</p>
                      )}

                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Commands:</p>
                        <div className="flex flex-wrap gap-2">
                          {macro.commands.map((cmd, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {idx + 1}. {cmd}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Switch
                        checked={macro.enabled}
                        onCheckedChange={(checked) => handleToggleMacro(macro.id, checked)}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEditMacro(macro)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDeleteMacro(macro.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      {/* Template Browser Dialog */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Library className="h-5 w-5" />
              Macro Template Library
            </DialogTitle>
            <DialogDescription>
              Choose from pre-built macro templates and customize them to your needs
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {MACRO_TEMPLATES.map((template) => (
              <Card key={template.id} className="hover:border-primary transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{template.icon}</span>
                      <div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <Badge variant="outline" className="text-xs mt-1">
                          {MACRO_CATEGORIES.find(c => c.value === template.category)?.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                  
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Trigger:</div>
                    <Badge variant="outline" className="text-xs">"{template.trigger_phrase}"</Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Commands:</div>
                    <div className="flex flex-wrap gap-1">
                      {template.commands.map((cmd, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {cmd}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {template.variables && template.variables.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Variable className="h-3 w-3" />
                        Variables:
                      </div>
                      <div className="space-y-1">
                        {template.variables.map((v, idx) => (
                          <div key={idx} className="text-xs text-muted-foreground">
                            • {`{${v.name}}`} - {v.description}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    size="sm"
                    onClick={() => handleApplyTemplate(template.id)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
