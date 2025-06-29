'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BusinessRule } from '@/types';
import { AIService } from '@/lib/ai-service';
import { 
  Plus, 
  Trash2, 
  Wand2, 
  Settings,
  Lightbulb,
  Download,
  Play
} from 'lucide-react';

interface RuleBuilderProps {
  rules: BusinessRule[];
  onAddRule: (rule: Omit<BusinessRule, 'id'>) => void;
  onDeleteRule: (ruleId: string) => void;
  onToggleRule: (ruleId: string) => void;
  onExportRules: () => void;
  data: any;
}

export function RuleBuilder({ 
  rules, 
  onAddRule, 
  onDeleteRule, 
  onToggleRule, 
  onExportRules,
  data 
}: RuleBuilderProps) {
  const [activeTab, setActiveTab] = useState('manual');
  const [newRule, setNewRule] = useState<{
    type: BusinessRule['type'];
    name: string;
    description: string;
    parameters: Record<string, any>;
  }>({
    type: 'coRun',
    name: '',
    description: '',
    parameters: {}
  });
  const [naturalLanguageRule, setNaturalLanguageRule] = useState('');
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  const aiService = new AIService();

  const ruleTypes = [
    { value: 'coRun', label: 'Co-run Tasks', description: 'Tasks that must run together' },
    { value: 'slotRestriction', label: 'Slot Restriction', description: 'Limit slot usage for groups' },
    { value: 'loadLimit', label: 'Load Limit', description: 'Maximum load per worker/group' },
    { value: 'phaseWindow', label: 'Phase Window', description: 'Restrict when tasks can run' },
    { value: 'patternMatch', label: 'Pattern Match', description: 'Regex-based rules' },
    { value: 'precedenceOverride', label: 'Precedence Override', description: 'Priority overrides' }
  ] as const;

  const addManualRule = () => {
    if (newRule.name && newRule.description) {
      onAddRule({
        ...newRule,
        isActive: true,
        createdBy: 'user'
      });
      
      setNewRule({
        type: 'coRun',
        name: '',
        description: '',
        parameters: {}
      });
    }
  };

  const generateAIRule = async () => {
    if (!naturalLanguageRule.trim()) return;
    
    setIsLoadingAI(true);
    try {
      const response = await aiService.generateRule(naturalLanguageRule, data);
      if (response.success && response.data) {
        onAddRule({
          ...response.data,
          isActive: true,
          createdBy: 'ai'
        });
        setNaturalLanguageRule('');
      }
    } catch (error) {
      console.error('Failed to generate AI rule:', error);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const getRecommendations = async () => {
    setIsLoadingAI(true);
    try {
      const response = await aiService.recommendRules(data);
      if (response.success) {
        setRecommendations(response.data || []);
      }
    } catch (error) {
      console.error('Failed to get recommendations:', error);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const applyRecommendation = (recommendation: any) => {
    onAddRule({
      type: recommendation.type,
      name: recommendation.name,
      description: recommendation.description,
      parameters: recommendation.parameters || {},
      isActive: true,
      createdBy: 'ai'
    });
  };

  const renderParameterEditor = () => {
    switch (newRule.type) {
      case 'coRun':
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="tasks">Task IDs (comma-separated)</Label>
              <Input
                id="tasks"
                placeholder="T1, T2, T3"
                onChange={(e) => setNewRule(prev => ({
                  ...prev,
                  parameters: { ...prev.parameters, tasks: e.target.value.split(',').map(t => t.trim()) }
                }))}
              />
            </div>
          </div>
        );
      
      case 'loadLimit':
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="workerGroup">Worker Group</Label>
              <Input
                id="workerGroup"
                placeholder="GroupA"
                onChange={(e) => setNewRule(prev => ({
                  ...prev,
                  parameters: { ...prev.parameters, workerGroup: e.target.value }
                }))}
              />
            </div>
            <div>
              <Label htmlFor="maxSlots">Max Slots Per Phase</Label>
              <Input
                id="maxSlots"
                type="number"
                placeholder="3"
                onChange={(e) => setNewRule(prev => ({
                  ...prev,
                  parameters: { ...prev.parameters, maxSlotsPerPhase: parseInt(e.target.value) }
                }))}
              />
            </div>
          </div>
        );
      
      case 'slotRestriction':
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="group">Group</Label>
              <Input
                id="group"
                placeholder="GroupA"
                onChange={(e) => setNewRule(prev => ({
                  ...prev,
                  parameters: { ...prev.parameters, group: e.target.value }
                }))}
              />
            </div>
            <div>
              <Label htmlFor="maxSlots">Max Slots</Label>
              <Input
                id="maxSlots"
                type="number"
                placeholder="5"
                onChange={(e) => setNewRule(prev => ({
                  ...prev,
                  parameters: { ...prev.parameters, maxSlots: parseInt(e.target.value) }
                }))}
              />
            </div>
          </div>
        );
      
      case 'phaseWindow':
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="taskIds">Task IDs (comma-separated)</Label>
              <Input
                id="taskIds"
                placeholder="T1, T2"
                onChange={(e) => setNewRule(prev => ({
                  ...prev,
                  parameters: { ...prev.parameters, taskIds: e.target.value.split(',').map(t => t.trim()) }
                }))}
              />
            </div>
            <div>
              <Label htmlFor="allowedPhases">Allowed Phases (comma-separated)</Label>
              <Input
                id="allowedPhases"
                placeholder="1, 2, 3"
                onChange={(e) => setNewRule(prev => ({
                  ...prev,
                  parameters: { ...prev.parameters, allowedPhases: e.target.value.split(',').map(p => parseInt(p.trim())).filter(n => !isNaN(n)) }
                }))}
              />
            </div>
          </div>
        );
      
      case 'patternMatch':
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="field">Field to Match</Label>
              <Input
                id="field"
                placeholder="TaskName"
                onChange={(e) => setNewRule(prev => ({
                  ...prev,
                  parameters: { ...prev.parameters, field: e.target.value }
                }))}
              />
            </div>
            <div>
              <Label htmlFor="pattern">Regex Pattern</Label>
              <Input
                id="pattern"
                placeholder="^[A-Z].*"
                onChange={(e) => setNewRule(prev => ({
                  ...prev,
                  parameters: { ...prev.parameters, pattern: e.target.value }
                }))}
              />
            </div>
          </div>
        );
      
      case 'precedenceOverride':
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="highPriorityTasks">High Priority Tasks (comma-separated)</Label>
              <Input
                id="highPriorityTasks"
                placeholder="T1, T2"
                onChange={(e) => setNewRule(prev => ({
                  ...prev,
                  parameters: { ...prev.parameters, highPriorityTasks: e.target.value.split(',').map(t => t.trim()) }
                }))}
              />
            </div>
            <div>
              <Label htmlFor="overridePriority">Override Priority Level</Label>
              <Input
                id="overridePriority"
                type="number"
                placeholder="5"
                min="1"
                max="5"
                onChange={(e) => setNewRule(prev => ({
                  ...prev,
                  parameters: { ...prev.parameters, overridePriority: parseInt(e.target.value) }
                }))}
              />
            </div>
          </div>
        );
      
      default:
        return (
          <div>
            <Label htmlFor="parameters">Parameters (JSON)</Label>
            <Textarea
              id="parameters"
              placeholder='{"key": "value"}'
              onChange={(e) => {
                try {
                  const params = JSON.parse(e.target.value);
                  setNewRule(prev => ({ ...prev, parameters: params }));
                } catch {
                  // Invalid JSON, ignore
                }
              }}
            />
          </div>
        );
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Business Rules</CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">{rules.length} rules</Badge>
            <Button onClick={onExportRules} size="sm" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manual">Manual</TabsTrigger>
            <TabsTrigger value="ai">AI Assistant</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>
          
          <TabsContent value="manual" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ruleType">Rule Type</Label>
                <Select
                  value={newRule.type}
                  onValueChange={(value: BusinessRule['type']) => setNewRule(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ruleTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-gray-500">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="ruleName">Rule Name</Label>
                <Input
                  id="ruleName"
                  value={newRule.name}
                  onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter rule name"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="ruleDescription">Description</Label>
              <Textarea
                id="ruleDescription"
                value={newRule.description}
                onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this rule does"
              />
            </div>
            
            {renderParameterEditor()}
            
            <Button onClick={addManualRule} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </TabsContent>
          
          <TabsContent value="ai" className="space-y-4">
            <div>
              <Label htmlFor="naturalRule">Describe your rule in plain English</Label>
              <Textarea
                id="naturalRule"
                value={naturalLanguageRule}
                onChange={(e) => setNaturalLanguageRule(e.target.value)}
                placeholder="e.g., Tasks T12 and T14 should always run together in the same phase"
                className="min-h-[100px]"
              />
            </div>
            
            <Button 
              onClick={generateAIRule} 
              disabled={isLoadingAI || !naturalLanguageRule.trim()}
              className="w-full"
            >
              {isLoadingAI ? (
                <Settings className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              Generate Rule
            </Button>
            
            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Try describing rules like: "Tasks requiring Python skills should have priority", 
                "GroupA workers should not exceed 4 tasks per phase", or "T1 must finish before T5 starts"
              </AlertDescription>
            </Alert>
          </TabsContent>
          
          <TabsContent value="recommendations" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">AI-generated recommendations based on your data patterns</p>
              <Button onClick={getRecommendations} disabled={isLoadingAI} size="sm">
                {isLoadingAI ? (
                  <Settings className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                <span className="ml-2">Analyze</span>
              </Button>
            </div>
            
            {recommendations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Click "Analyze" to discover rule recommendations</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recommendations.map((rec, index) => (
                  <Alert key={index} className="border-l-4 border-l-blue-500">
                    <Lightbulb className="h-4 w-4 text-blue-500" />
                    <AlertDescription>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium mb-1">{rec.name}</div>
                          <div className="text-sm text-gray-600 mb-2">{rec.description}</div>
                          {rec.reasoning && (
                            <div className="text-xs text-gray-500">{rec.reasoning}</div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <Badge variant="outline" className="text-xs">
                            {Math.round(rec.confidence * 100)}%
                          </Badge>
                          <Button size="sm" onClick={() => applyRecommendation(rec)}>
                            Apply
                          </Button>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {/* Active Rules List */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-gray-700">Active Rules ({rules.filter(r => r.isActive).length})</h4>
          {rules.length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-sm">
              No rules created yet
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-3 border rounded-lg ${rule.isActive ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-sm">{rule.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {rule.type}
                        </Badge>
                        {rule.createdBy === 'ai' && (
                          <Badge variant="secondary" className="text-xs">
                            <Wand2 className="h-3 w-3 mr-1" />
                            AI
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600">{rule.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onToggleRule(rule.id)}
                        className={rule.isActive ? 'text-green-600' : 'text-gray-400'}
                      >
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDeleteRule(rule.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}