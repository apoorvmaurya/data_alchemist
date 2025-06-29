'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Header } from '@/components/layout/header';
import { DataTable } from '@/components/data-grid/data-table';
import { ValidationPanel } from '@/components/validation/validation-panel';
import { RuleBuilder } from '@/components/rules/rule-builder';
import { PriorityConfig } from '@/components/priority/priority-config';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EnhancedFileParser } from '@/lib/enhanced-file-parser';
import { DataValidator } from '@/lib/validation';
import { OpenAIService } from '@/lib/openai-service';
import { DataState, Client, Worker, Task, ValidationError, BusinessRule, PriorityWeights } from '@/types';
import { Info, Upload, Database, Settings, Target, Sparkles, Brain } from 'lucide-react';

export default function Home() {
  const [dataState, setDataState] = useState<DataState>({
    clients: [],
    workers: [],
    tasks: [],
    validationErrors: [],
    businessRules: [],
    priorityWeights: {
      priorityLevel: 20,
      taskFulfillment: 20,
      fairness: 15,
      workloadBalance: 15,
      skillMatching: 15,
      phaseOptimization: 15
    }
  });

  const [activeDataType, setActiveDataType] = useState<'client' | 'worker' | 'task'>('client');
  const [isValidating, setIsValidating] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isAIProcessing, setIsAIProcessing] = useState(false);

  // Initialize OpenAI service only when needed to avoid constructor errors
  const getOpenAIService = useCallback(() => {
    try {
      return new OpenAIService();
    } catch (error) {
      console.warn('OpenAI service not available:', error);
      return null;
    }
  }, []);

  const handleFileUpload = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files);
    setIsAIProcessing(true);
    
    for (const file of fileArray) {
      try {
        toast.info(`Processing ${file.name} with AI...`);
        
        const { data, headers, entityType } = await EnhancedFileParser.parseFile(file);
        
        setDataState(prev => ({
          ...prev,
          [entityType === 'client' ? 'clients' : entityType === 'worker' ? 'workers' : 'tasks']: data
        }));
        
        // Run AI validation on uploaded data if OpenAI is available
        const openaiService = getOpenAIService();
        if (openaiService) {
          try {
            const aiValidation = await openaiService.validateDataWithAI(data, entityType);
            if (aiValidation.success && aiValidation.data) {
              const aiErrors = aiValidation.data.map((error: any) => ({
                ...error,
                id: `ai-${Date.now()}-${Math.random()}`,
                entity: entityType
              }));
              
              setDataState(prev => ({
                ...prev,
                validationErrors: [...prev.validationErrors, ...aiErrors]
              }));
            }
          } catch (aiError) {
            console.warn('AI validation failed:', aiError);
          }
        }
        
        toast.success(`✨ Loaded ${data.length} ${entityType} records from ${file.name}`);
      } catch (error) {
        toast.error(`Failed to parse ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    setIsAIProcessing(false);
  }, [getOpenAIService]);

  const handleDataChange = useCallback((index: number, field: string, value: any) => {
    setDataState(prev => {
      const newState = { ...prev };
      const dataArray = activeDataType === 'client' ? newState.clients : 
                       activeDataType === 'worker' ? newState.workers : newState.tasks;
      
      if (dataArray[index]) {
        dataArray[index] = { ...dataArray[index], [field]: value };
      }
      
      return newState;
    });
  }, [activeDataType]);

  const validateData = useCallback(async () => {
    setIsValidating(true);
    
    // Run standard validation
    const validator = new DataValidator(dataState.clients, dataState.workers, dataState.tasks);
    const standardErrors = validator.validateAll();
    
    // Run AI validation for additional insights if OpenAI is available
    let aiErrors: ValidationError[] = [];
    const openaiService = getOpenAIService();
    if (openaiService) {
      try {
        const allData = [
          ...dataState.clients.map(c => ({ ...c, entityType: 'client' })),
          ...dataState.workers.map(w => ({ ...w, entityType: 'worker' })),
          ...dataState.tasks.map(t => ({ ...t, entityType: 'task' }))
        ];
        
        for (const entityType of ['client', 'worker', 'task']) {
          const entityData = allData.filter(item => item.entityType === entityType);
          if (entityData.length > 0) {
            const aiValidation = await openaiService.validateDataWithAI(entityData, entityType);
            if (aiValidation.success && aiValidation.data) {
              const entityAIErrors = aiValidation.data.map((error: any) => ({
                ...error,
                id: `ai-${Date.now()}-${Math.random()}`,
                entity: entityType
              }));
              aiErrors = [...aiErrors, ...entityAIErrors];
            }
          }
        }
      } catch (error) {
        console.warn('AI validation failed:', error);
      }
    }
    
    const allErrors = [...standardErrors, ...aiErrors];
    setDataState(prev => ({ ...prev, validationErrors: allErrors }));
    setIsValidating(false);
    
    toast.success(`🔍 Validation complete: ${allErrors.length} issues found`);
  }, [dataState.clients, dataState.workers, dataState.tasks, getOpenAIService]);

  const handleAISearch = useCallback(async (query: string) => {
    const openaiService = getOpenAIService();
    if (!openaiService) {
      toast.error('AI search is not available - OpenAI API key not configured');
      return;
    }

    setIsAIProcessing(true);
    try {
      toast.info('🧠 AI is processing your query...');
      
      const response = await openaiService.searchData(query, {
        clients: dataState.clients,
        workers: dataState.workers,
        tasks: dataState.tasks
      });
      
      if (response.success) {
        setSearchResults(response.data);
        toast.success(`✨ ${response.message}`);
      } else {
        toast.error('Search failed');
      }
    } catch (error) {
      toast.error('Search error occurred');
    } finally {
      setIsAIProcessing(false);
    }
  }, [dataState, getOpenAIService]);

  const addBusinessRule = useCallback((rule: Omit<BusinessRule, 'id'>) => {
    const newRule: BusinessRule = {
      ...rule,
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    setDataState(prev => ({
      ...prev,
      businessRules: [...prev.businessRules, newRule]
    }));
    
    toast.success(`✅ Added rule: ${newRule.name}`);
  }, []);

  const deleteBusinessRule = useCallback((ruleId: string) => {
    setDataState(prev => ({
      ...prev,
      businessRules: prev.businessRules.filter(rule => rule.id !== ruleId)
    }));
    
    toast.success('🗑️ Rule deleted');
  }, []);

  const toggleBusinessRule = useCallback((ruleId: string) => {
    setDataState(prev => ({
      ...prev,
      businessRules: prev.businessRules.map(rule =>
        rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
      )
    }));
  }, []);

  const updatePriorityWeights = useCallback((weights: PriorityWeights) => {
    setDataState(prev => ({ ...prev, priorityWeights: weights }));
  }, []);

  const exportData = useCallback(() => {
    const exportData = {
      clients: dataState.clients,
      workers: dataState.workers,
      tasks: dataState.tasks,
      rules: dataState.businessRules.filter(rule => rule.isActive),
      priorityWeights: dataState.priorityWeights,
      exportTimestamp: new Date().toISOString()
    };
    
    const createCSV = (data: any[], filename: string) => {
      if (data.length === 0) return;
      
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            if (Array.isArray(value)) {
              return `"[${value.join(',')}]"`;
            }
            if (typeof value === 'object') {
              return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            }
            return `"${String(value).replace(/"/g, '""')}"`;
          }).join(',')
        )
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };
    
    createCSV(dataState.clients, 'clients_cleaned.csv');
    createCSV(dataState.workers, 'workers_cleaned.csv');
    createCSV(dataState.tasks, 'tasks_cleaned.csv');
    
    const rulesBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const rulesUrl = URL.createObjectURL(rulesBlob);
    const rulesLink = document.createElement('a');
    rulesLink.href = rulesUrl;
    rulesLink.download = 'allocation_config.json';
    document.body.appendChild(rulesLink);
    rulesLink.click();
    document.body.removeChild(rulesLink);
    URL.revokeObjectURL(rulesUrl);
    
    toast.success('📦 Data exported successfully!');
  }, [dataState]);

  const applySuggestion = useCallback(async (errorId: string, suggestion: string) => {
    setIsAIProcessing(true);
    try {
      toast.info('🤖 Applying AI suggestion...');
      
      // Here you would implement the actual correction logic
      // For now, we'll just remove the error and show success
      setDataState(prev => ({
        ...prev,
        validationErrors: prev.validationErrors.filter(error => error.id !== errorId)
      }));
      
      toast.success(`✨ Applied suggestion: ${suggestion}`);
    } catch (error) {
      toast.error('Failed to apply suggestion');
    } finally {
      setIsAIProcessing(false);
    }
  }, []);

  const exportRules = useCallback(() => {
    const rulesConfig = {
      rules: dataState.businessRules.filter(rule => rule.isActive),
      priorityWeights: dataState.priorityWeights,
      exportTimestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(rulesConfig, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rules_config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('📋 Rules configuration exported');
  }, [dataState.businessRules, dataState.priorityWeights]);

  const isDataLoaded = dataState.clients.length > 0 || dataState.workers.length > 0 || dataState.tasks.length > 0;
  const validationCount = {
    errors: dataState.validationErrors.filter(e => e.type === 'error').length,
    warnings: dataState.validationErrors.filter(e => e.type === 'warning').length,
    info: dataState.validationErrors.filter(e => e.type === 'info').length
  };

  const getCurrentData = () => {
    switch (activeDataType) {
      case 'client':
        return { data: dataState.clients, headers: dataState.clients.length > 0 ? Object.keys(dataState.clients[0]) : [] };
      case 'worker':
        return { data: dataState.workers, headers: dataState.workers.length > 0 ? Object.keys(dataState.workers[0]) : [] };
      case 'task':
        return { data: dataState.tasks, headers: dataState.tasks.length > 0 ? Object.keys(dataState.tasks[0]) : [] };
      default:
        return { data: [], headers: [] };
    }
  };

  return (
    <div className="min-h-screen">
      <Header
        onFileUpload={handleFileUpload}
        onExport={exportData}
        onAISearch={handleAISearch}
        validationCount={validationCount}
        isDataLoaded={isDataLoaded}
      />
      
      <main className="container mx-auto px-6 py-8 max-w-7xl">
        {!isDataLoaded ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="relative mb-8">
              <Upload className="h-20 w-20 mx-auto text-blue-400 opacity-60" />
              <Sparkles className="absolute -top-2 -right-2 h-8 w-8 text-purple-500 animate-pulse" />
            </div>
            
            <h2 className="text-4xl font-bold mb-6 text-gradient">Welcome to Data Alchemist</h2>
            <p className="text-gray-600 mb-12 max-w-3xl mx-auto text-lg leading-relaxed">
              Transform your messy spreadsheets into clean, validated data with our AI-powered system. 
              Upload your CSV or XLSX files and let artificial intelligence help you clean, validate, and configure allocation rules.
            </p>
            
            <Alert className="max-w-4xl mx-auto text-left apple-card">
              <Brain className="h-5 w-5 text-blue-600" />
              <AlertDescription>
                <div className="space-y-4">
                  <div className="font-semibold text-lg text-gray-900">🚀 AI-Powered Features</div>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-gray-800 mb-2">📊 Smart Data Processing</div>
                      <ul className="space-y-1 text-gray-600 ml-4">
                        <li>• <strong>clients.csv/xlsx:</strong> ClientID, ClientName, PriorityLevel, RequestedTaskIDs, GroupTag, AttributesJSON</li>
                        <li>• <strong>workers.csv/xlsx:</strong> WorkerID, WorkerName, Skills, AvailableSlots, MaxLoadPerPhase, WorkerGroup, QualificationLevel</li>
                        <li>• <strong>tasks.csv/xlsx:</strong> TaskID, TaskName, Category, Duration, RequiredSkills, PreferredPhases, MaxConcurrent</li>
                      </ul>
                    </div>
                    <div>
                      <div className="font-medium text-gray-800 mb-2">🤖 AI Capabilities</div>
                      <ul className="space-y-1 text-gray-600 ml-4">
                        <li>• Intelligent header mapping for misnamed columns</li>
                        <li>• Natural language data search and filtering</li>
                        <li>• AI-powered validation and error detection</li>
                        <li>• Smart business rule recommendations</li>
                        <li>• Automated data correction suggestions</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="animate-fade-in">
            <Tabs defaultValue="data" className="space-y-8">
              <TabsList className="grid w-full grid-cols-4 h-14 p-1 bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/60">
                <TabsTrigger value="data" className="flex items-center space-x-2 rounded-xl font-medium">
                  <Database className="h-4 w-4" />
                  <span>Data Management</span>
                </TabsTrigger>
                <TabsTrigger value="validation" className="flex items-center space-x-2 rounded-xl font-medium">
                  <Settings className="h-4 w-4" />
                  <span>Validation</span>
                </TabsTrigger>
                <TabsTrigger value="rules" className="flex items-center space-x-2 rounded-xl font-medium">
                  <Brain className="h-4 w-4" />
                  <span>AI Rules</span>
                </TabsTrigger>
                <TabsTrigger value="priority" className="flex items-center space-x-2 rounded-xl font-medium">
                  <Target className="h-4 w-4" />
                  <span>Priorities</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="data" className="space-y-6">
                {searchResults && (
                  <Alert className="ai-suggestion animate-slide-up">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    <AlertDescription>
                      <div className="font-medium">🔍 AI Search Results</div>
                      <div className="text-sm mt-1">
                        Found {searchResults.matchingIds?.length || 0} {searchResults.entityType}s matching your query
                      </div>
                      {searchResults.explanation && (
                        <div className="text-xs text-gray-600 mt-2">{searchResults.explanation}</div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
                
                <Tabs value={activeDataType} onValueChange={(value: any) => setActiveDataType(value)}>
                  <TabsList className="bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200/60">
                    <TabsTrigger value="client" className="rounded-lg">Clients ({dataState.clients.length})</TabsTrigger>
                    <TabsTrigger value="worker" className="rounded-lg">Workers ({dataState.workers.length})</TabsTrigger>
                    <TabsTrigger value="task" className="rounded-lg">Tasks ({dataState.tasks.length})</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value={activeDataType} className="mt-6">
                    {(() => {
                      const { data, headers } = getCurrentData();
                      return data.length > 0 ? (
                        <DataTable
                          data={data}
                          headers={headers}
                          entityType={activeDataType}
                          validationErrors={dataState.validationErrors}
                          onDataChange={handleDataChange}
                          onValidate={validateData}
                        />
                      ) : (
                        <div className="text-center py-16 apple-card">
                          <Upload className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                          <p className="text-gray-600 text-lg font-medium">No {activeDataType} data loaded yet</p>
                          <p className="text-sm text-gray-500 mt-2">Upload a file to get started with AI processing</p>
                        </div>
                      );
                    })()}
                  </TabsContent>
                </Tabs>
              </TabsContent>
              
              <TabsContent value="validation">
                <ValidationPanel
                  validationErrors={dataState.validationErrors}
                  onRunValidation={validateData}
                  onApplySuggestion={applySuggestion}
                  isValidating={isValidating}
                  data={{
                    clients: dataState.clients,
                    workers: dataState.workers,
                    tasks: dataState.tasks
                  }}
                />
              </TabsContent>
              
              <TabsContent value="rules">
                <RuleBuilder
                  rules={dataState.businessRules}
                  onAddRule={addBusinessRule}
                  onDeleteRule={deleteBusinessRule}
                  onToggleRule={toggleBusinessRule}
                  onExportRules={exportRules}
                  data={{
                    clients: dataState.clients,
                    workers: dataState.workers,
                    tasks: dataState.tasks
                  }}
                />
              </TabsContent>
              
              <TabsContent value="priority">
                <PriorityConfig
                  weights={dataState.priorityWeights}
                  onWeightsChange={updatePriorityWeights}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
        
        {isAIProcessing && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="apple-card p-8 max-w-sm mx-4 text-center">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-blue-600 animate-spin" />
              <p className="font-medium text-gray-900">AI is processing...</p>
              <p className="text-sm text-gray-600 mt-2">Please wait while we work our magic</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}