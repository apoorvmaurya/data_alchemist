'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ValidationError } from '@/types';
import { AIService } from '@/lib/ai-service';
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  Wand2,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

interface ValidationPanelProps {
  validationErrors: ValidationError[];
  onRunValidation: () => void;
  onApplySuggestion: (errorId: string, suggestion: string) => void;
  isValidating: boolean;
  data: any;
}

export function ValidationPanel({ 
  validationErrors, 
  onRunValidation, 
  onApplySuggestion,
  isValidating,
  data 
}: ValidationPanelProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const aiService = new AIService();

  const errorsByType = {
    error: validationErrors.filter(e => e.type === 'error'),
    warning: validationErrors.filter(e => e.type === 'warning'),
    info: validationErrors.filter(e => e.type === 'info')
  };

  const errorsByEntity = {
    client: validationErrors.filter(e => e.entity === 'client'),
    worker: validationErrors.filter(e => e.entity === 'worker'),
    task: validationErrors.filter(e => e.entity === 'task')
  };

  const getErrorIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getErrorBadgeVariant = (type: string) => {
    switch (type) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const generateAISuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      const response = await aiService.suggestCorrections(validationErrors, data);
      if (response.success) {
        setSuggestions(response.data || []);
      }
    } catch (error) {
      console.error('Failed to generate AI suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const renderErrorList = (errors: ValidationError[], title: string) => (
    <div className="space-y-3">
      <h4 className="font-medium text-sm text-gray-700">{title}</h4>
      {errors.length === 0 ? (
        <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm">No issues found</span>
        </div>
      ) : (
        <div className="space-y-2">
          {errors.map((error) => (
            <Alert key={error.id} className="border-l-4 border-l-red-500">
              <div className="flex items-start space-x-3">
                {getErrorIcon(error.type)}
                <div className="flex-1 min-w-0">
                  <AlertDescription className="text-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="break-words">{error.message}</span>
                      <Badge variant={getErrorBadgeVariant(error.type)} className="text-xs self-start sm:self-center">
                        {error.field || 'General'}
                      </Badge>
                    </div>
                    {error.rowIndex !== undefined && (
                      <div className="mt-1 text-xs text-gray-500">
                        Row {error.rowIndex + 1} • {error.entity}
                      </div>
                    )}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          ))}
        </div>
      )}
    </div>
  );

  const renderSuggestions = () => (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h4 className="font-medium text-sm text-gray-700">AI Suggestions</h4>
        <Button
          onClick={generateAISuggestions}
          disabled={isLoadingSuggestions || validationErrors.length === 0}
          size="sm"
          variant="outline"
          className="responsive-button"
        >
          {isLoadingSuggestions ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="h-4 w-4" />
          )}
          <span className="ml-2">Generate</span>
        </Button>
      </div>
      
      {suggestions.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          <Wand2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Click "Generate" to get AI-powered correction suggestions</p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((suggestion, index) => (
            <Alert key={index} className="border-l-4 border-l-blue-500">
              <div className="flex items-start space-x-3">
                <Wand2 className="h-4 w-4 text-blue-500 mt-0.5" />
                <div className="flex-1">
                  <AlertDescription className="text-sm">
                    <div className="font-medium mb-1">{suggestion.suggestion}</div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <Badge variant="outline" className="text-xs self-start">
                        Confidence: {Math.round(suggestion.confidence * 100)}%
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onApplySuggestion(suggestion.errorId, suggestion.suggestion)}
                        className="text-xs self-start sm:self-center"
                      >
                        Apply
                      </Button>
                    </div>
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Validation Results</CardTitle>
        <Button
          onClick={onRunValidation}
          disabled={isValidating}
          size="sm"
          className="responsive-button flex items-center space-x-2"
        >
          {isValidating ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          <span>Validate</span>
        </Button>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="px-4 sm:px-6 pb-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span>{errorsByType.error.length} Errors</span>
            </div>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span>{errorsByType.warning.length} Warnings</span>
            </div>
            <div className="flex items-center space-x-2">
              <Info className="h-4 w-4 text-blue-500" />
              <span>{errorsByType.info.length} Info</span>
            </div>
          </div>
        </div>
        
        <Tabs defaultValue="by-type" className="px-4 sm:px-6">
          <div className="responsive-overflow">
            <TabsList className="grid w-full grid-cols-3 min-w-max">
              <TabsTrigger value="by-type" className="text-xs sm:text-sm">By Type</TabsTrigger>
              <TabsTrigger value="by-entity" className="text-xs sm:text-sm">By Entity</TabsTrigger>
              <TabsTrigger value="suggestions" className="text-xs sm:text-sm">AI Suggestions</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="by-type" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                {renderErrorList(errorsByType.error, 'Errors')}
                {renderErrorList(errorsByType.warning, 'Warnings')}
                {renderErrorList(errorsByType.info, 'Information')}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="by-entity" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                {renderErrorList(errorsByEntity.client, 'Client Issues')}
                {renderErrorList(errorsByEntity.worker, 'Worker Issues')}
                {renderErrorList(errorsByEntity.task, 'Task Issues')}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="suggestions" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              {renderSuggestions()}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}