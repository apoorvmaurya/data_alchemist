import OpenAI from 'openai';
import { Client, Worker, Task, ValidationError, BusinessRule, AIResponse } from '@/types';

export class OpenAIService {
  private openai: OpenAI | null = null;
  private isAvailable: boolean = false;

  constructor() {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    
    if (apiKey && apiKey !== 'sk-your-openai-api-key-here' && apiKey !== 'your_openai_api_key_here') {
      try {
        this.openai = new OpenAI({
          apiKey: apiKey,
          dangerouslyAllowBrowser: true
        });
        this.isAvailable = true;
      } catch (error) {
        console.warn('Failed to initialize OpenAI service:', error);
        this.isAvailable = false;
      }
    } else {
      console.info('OpenAI API key not configured - AI features will be disabled');
      this.isAvailable = false;
    }
  }

  private checkAvailability(): boolean {
    if (!this.isAvailable || !this.openai) {
      console.warn('OpenAI service is not available');
      return false;
    }
    return true;
  }

  async parseHeaders(headers: string[], entityType: string): Promise<AIResponse> {
    if (!this.checkAvailability()) {
      return this.getFallbackHeaderMapping(headers, entityType);
    }

    try {
      const expectedHeaders = this.getExpectedHeaders(entityType);
      
      const prompt = `
        You are a data mapping expert. Map the provided CSV headers to the expected data structure.
        
        Entity Type: ${entityType}
        Expected Headers: ${expectedHeaders.join(', ')}
        Provided Headers: ${headers.join(', ')}
        
        Return a JSON mapping object where keys are expected headers and values are the closest matching provided headers.
        If no match is found, use null.
        
        Example: {"ClientID": "client_id", "ClientName": "name", "PriorityLevel": null}
        
        Only return the JSON object, no other text.
      `;

      const response = await this.openai!.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a data mapping assistant. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 500
      });

      const mapping = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        success: true,
        data: mapping,
        message: 'Headers mapped successfully with AI'
      };
    } catch (error) {
      console.warn('AI header mapping failed, using fallback:', error);
      return this.getFallbackHeaderMapping(headers, entityType);
    }
  }

  async validateDataWithAI(data: any[], entityType: string): Promise<AIResponse> {
    if (!this.checkAvailability()) {
      return {
        success: false,
        message: 'AI validation not available - OpenAI API key not configured'
      };
    }

    try {
      const sampleData = data.slice(0, Math.min(5, data.length)); // Limit sample size
      
      const prompt = `
        Analyze this ${entityType} data for potential issues beyond basic validation.
        Look for patterns, inconsistencies, and business logic violations.
        
        Data sample: ${JSON.stringify(sampleData, null, 2)}
        
        Return a JSON array of validation issues:
        [
          {
            "type": "error|warning|info",
            "message": "Description of the issue",
            "field": "field_name",
            "rowIndex": 0,
            "suggestion": "How to fix this"
          }
        ]
        
        Focus on:
        - Data quality issues
        - Business logic violations
        - Inconsistent patterns
        - Missing relationships
        - Unusual values that might be errors
        
        Only return the JSON array, no other text.
      `;

      const response = await this.openai!.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a data quality expert. Return only valid JSON arrays.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 1000
      });

      const validationIssues = JSON.parse(response.choices[0].message.content || '[]');
      
      return {
        success: true,
        data: validationIssues,
        message: `AI found ${validationIssues.length} additional validation issues`
      };
    } catch (error) {
      console.error('OpenAI validation error:', error);
      return {
        success: false,
        message: 'AI validation failed'
      };
    }
  }

  async searchData(query: string, data: { clients: Client[], workers: Worker[], tasks: Task[] }): Promise<AIResponse> {
    if (!this.checkAvailability()) {
      return this.getFallbackSearch(query, data);
    }

    try {
      const prompt = `
        Parse this natural language query and return matching data IDs.
        
        Query: "${query}"
        
        Available data:
        - Clients: ${data.clients.length} records with fields: ClientID, ClientName, PriorityLevel, RequestedTaskIDs, GroupTag
        - Workers: ${data.workers.length} records with fields: WorkerID, WorkerName, Skills, AvailableSlots, MaxLoadPerPhase, WorkerGroup
        - Tasks: ${data.tasks.length} records with fields: TaskID, TaskName, Category, Duration, RequiredSkills, PreferredPhases, MaxConcurrent
        
        Sample data for context:
        Clients: ${JSON.stringify(data.clients.slice(0, 3), null, 2)}
        Workers: ${JSON.stringify(data.workers.slice(0, 3), null, 2)}
        Tasks: ${JSON.stringify(data.tasks.slice(0, 3), null, 2)}
        
        Return JSON:
        {
          "entityType": "client|worker|task",
          "matchingIds": ["ID1", "ID2", ...],
          "filters": {"field": "value", ...},
          "explanation": "What was found"
        }
        
        Only return the JSON object, no other text.
      `;

      const response = await this.openai!.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a data query assistant. Parse natural language into structured queries and return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 800
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      // Apply the filters to get actual matching IDs
      const matchingIds = this.applyFilters(result, data);
      
      return {
        success: true,
        data: {
          ...result,
          matchingIds
        },
        message: result.explanation || 'Query processed successfully with AI'
      };
    } catch (error) {
      console.error('OpenAI search error:', error);
      return this.getFallbackSearch(query, data);
    }
  }

  async suggestDataModifications(query: string, data: any[], entityType: string): Promise<AIResponse> {
    if (!this.checkAvailability()) {
      return {
        success: false,
        message: 'AI suggestions not available - OpenAI API key not configured'
      };
    }

    try {
      const prompt = `
        Analyze this modification request and suggest specific changes.
        
        Request: "${query}"
        Entity Type: ${entityType}
        Current Data Sample: ${JSON.stringify(data.slice(0, 5), null, 2)}
        
        Return JSON array of modification suggestions:
        [
          {
            "rowIndex": 0,
            "field": "field_name",
            "currentValue": "current",
            "suggestedValue": "new_value",
            "reason": "Why this change",
            "confidence": 0.95
          }
        ]
        
        Be very careful with suggestions. Only suggest changes you're confident about.
        Only return the JSON array, no other text.
      `;

      const response = await this.openai!.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a data modification expert. Be conservative and only suggest changes you are very confident about. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 1000
      });

      const suggestions = JSON.parse(response.choices[0].message.content || '[]');
      
      return {
        success: true,
        data: suggestions,
        message: `Generated ${suggestions.length} modification suggestions`
      };
    } catch (error) {
      console.error('OpenAI modification error:', error);
      return {
        success: false,
        message: 'Could not generate modification suggestions'
      };
    }
  }

  async generateCorrections(errors: ValidationError[], data: any): Promise<AIResponse> {
    if (!this.checkAvailability()) {
      return {
        success: false,
        message: 'AI corrections not available - OpenAI API key not configured'
      };
    }

    try {
      const errorSample = errors.slice(0, 10);
      
      const prompt = `
        Analyze these validation errors and suggest specific corrections.
        
        Errors: ${JSON.stringify(errorSample, null, 2)}
        
        Context Data Sample: ${JSON.stringify(data, null, 2)}
        
        Return JSON array of correction suggestions:
        [
          {
            "errorId": "error_id",
            "correction": "Specific fix to apply",
            "newValue": "exact_new_value",
            "confidence": 0.9,
            "reasoning": "Why this fix"
          }
        ]
        
        Only suggest corrections you're very confident about.
        Only return the JSON array, no other text.
      `;

      const response = await this.openai!.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a data correction expert. Only suggest fixes you are very confident about. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 1200
      });

      const corrections = JSON.parse(response.choices[0].message.content || '[]');
      
      return {
        success: true,
        data: corrections,
        message: `Generated ${corrections.length} correction suggestions`
      };
    } catch (error) {
      console.error('OpenAI correction error:', error);
      return {
        success: false,
        message: 'Could not generate corrections'
      };
    }
  }

  async generateRule(description: string, context: any): Promise<AIResponse> {
    if (!this.checkAvailability()) {
      return this.getFallbackRuleGeneration(description);
    }

    try {
      const prompt = `
        Convert this natural language rule into a structured business rule.
        
        Rule Description: "${description}"
        
        Data Context: ${JSON.stringify(context, null, 2)}
        
        Available rule types:
        - coRun: Tasks that must run together
        - slotRestriction: Limit slot usage for groups
        - loadLimit: Maximum load per worker/group
        - phaseWindow: Restrict when tasks can run
        - patternMatch: Pattern-based rules using regex
        - precedenceOverride: Priority overrides
        
        Return JSON:
        {
          "type": "rule_type",
          "name": "Human readable rule name",
          "description": "Detailed description",
          "parameters": {
            "key": "value"
          },
          "confidence": 0.9,
          "reasoning": "Why this rule structure"
        }
        
        Only return the JSON object, no other text.
      `;

      const response = await this.openai!.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a business rules expert. Convert natural language into structured rules. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 800
      });

      const rule = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        success: true,
        data: rule,
        message: 'Rule generated successfully with AI'
      };
    } catch (error) {
      console.error('OpenAI rule generation error:', error);
      return this.getFallbackRuleGeneration(description);
    }
  }

  async recommendRules(data: { clients: Client[], workers: Worker[], tasks: Task[] }): Promise<AIResponse> {
    if (!this.checkAvailability()) {
      return this.getFallbackRuleRecommendations();
    }

    try {
      const dataStats = {
        clientCount: data.clients.length,
        workerCount: data.workers.length,
        taskCount: data.tasks.length,
        sampleClients: data.clients.slice(0, 3),
        sampleWorkers: data.workers.slice(0, 3),
        sampleTasks: data.tasks.slice(0, 3)
      };

      const prompt = `
        Analyze this resource allocation data and recommend business rules.
        
        Data Overview: ${JSON.stringify(dataStats, null, 2)}
        
        Look for patterns like:
        - Tasks that frequently appear together in client requests
        - Workers or groups that might be overloaded
        - Skills that are in high demand vs availability
        - Phase conflicts or bottlenecks
        - Priority imbalances
        
        Return JSON array of rule recommendations:
        [
          {
            "type": "rule_type",
            "name": "Rule name",
            "description": "What this rule does",
            "reasoning": "Why this rule is recommended",
            "confidence": 0.8,
            "parameters": {
              "key": "value"
            },
            "impact": "Expected benefit"
          }
        ]
        
        Only return the JSON array, no other text.
      `;

      const response = await this.openai!.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a business intelligence expert. Analyze data patterns and recommend optimization rules. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1500
      });

      const recommendations = JSON.parse(response.choices[0].message.content || '[]');
      
      return {
        success: true,
        data: recommendations,
        message: `Generated ${recommendations.length} rule recommendations with AI`
      };
    } catch (error) {
      console.error('OpenAI rule recommendation error:', error);
      return this.getFallbackRuleRecommendations();
    }
  }

  // Fallback methods for when AI is not available
  private getFallbackHeaderMapping(headers: string[], entityType: string): AIResponse {
    const mapping: Record<string, string> = {};
    const expectedHeaders = this.getExpectedHeaders(entityType);
    
    expectedHeaders.forEach(expected => {
      const found = headers.find(header => 
        header.toLowerCase().replace(/[_\s]/g, '') === expected.toLowerCase().replace(/[_\s]/g, '')
      );
      if (found) {
        mapping[expected] = found;
      }
    });
    
    return {
      success: true,
      data: mapping,
      message: 'Headers mapped using fallback logic'
    };
  }

  private getFallbackSearch(query: string, data: { clients: Client[], workers: Worker[], tasks: Task[] }): AIResponse {
    const lowercaseQuery = query.toLowerCase();
    
    // Simple keyword matching
    if (lowercaseQuery.includes('duration') && lowercaseQuery.includes('more than')) {
      const durationMatch = lowercaseQuery.match(/more than (\d+)/);
      const minDuration = durationMatch ? parseInt(durationMatch[1]) : 1;
      
      const matchingTasks = data.tasks.filter(task => task.Duration > minDuration);
      
      return {
        success: true,
        data: {
          entityType: 'task',
          filters: { duration: `>${minDuration}` },
          matchingIds: matchingTasks.map(t => t.TaskID),
          explanation: `Found ${matchingTasks.length} tasks with duration > ${minDuration} (fallback search)`
        },
        message: `Found ${matchingTasks.length} tasks with duration > ${minDuration}`
      };
    }
    
    if (lowercaseQuery.includes('priority') && lowercaseQuery.includes('5')) {
      const matchingClients = data.clients.filter(client => client.PriorityLevel === 5);
      
      return {
        success: true,
        data: {
          entityType: 'client',
          filters: { priorityLevel: 5 },
          matchingIds: matchingClients.map(c => c.ClientID),
          explanation: `Found ${matchingClients.length} high priority clients (fallback search)`
        },
        message: `Found ${matchingClients.length} high priority clients`
      };
    }
    
    return {
      success: true,
      data: {
        entityType: 'task',
        filters: {},
        matchingIds: [],
        explanation: 'No matches found for this query (fallback search)'
      },
      message: 'No matches found for this query'
    };
  }

  private getFallbackRuleGeneration(description: string): AIResponse {
    const lowercaseDesc = description.toLowerCase();
    
    if (lowercaseDesc.includes('together') || lowercaseDesc.includes('co-run')) {
      return {
        success: true,
        data: {
          type: 'coRun',
          name: 'Co-run Tasks',
          description: 'Tasks that must run together',
          parameters: {
            tasks: ['T1', 'T2'],
            enforceOrder: false
          },
          confidence: 0.8
        },
        message: 'Co-run rule generated (fallback)'
      };
    }
    
    if (lowercaseDesc.includes('load') || lowercaseDesc.includes('limit')) {
      return {
        success: true,
        data: {
          type: 'loadLimit',
          name: 'Load Limit Rule',
          description: 'Limit maximum load per worker group',
          parameters: {
            workerGroup: 'GroupA',
            maxSlotsPerPhase: 3
          },
          confidence: 0.7
        },
        message: 'Load limit rule generated (fallback)'
      };
    }
    
    return {
      success: false,
      message: 'Could not parse rule description (fallback failed)'
    };
  }

  private getFallbackRuleRecommendations(): AIResponse {
    const recommendations = [
      {
        type: 'coRun',
        name: 'Suggested Co-run Rule',
        description: 'Tasks that often appear together in client requests',
        confidence: 0.75,
        reasoning: 'Based on common patterns in resource allocation',
        parameters: { tasks: ['T1', 'T2'] },
        impact: 'Improved task coordination'
      },
      {
        type: 'loadLimit',
        name: 'Worker Load Balance',
        description: 'Limit worker groups to prevent overload',
        confidence: 0.85,
        reasoning: 'Prevents resource bottlenecks',
        parameters: { workerGroup: 'GroupA', maxSlotsPerPhase: 3 },
        impact: 'Better workload distribution'
      }
    ];

    return {
      success: true,
      data: recommendations,
      message: 'Generated 2 rule recommendations (fallback)'
    };
  }

  private getExpectedHeaders(entityType: string): string[] {
    switch (entityType) {
      case 'client':
        return ['ClientID', 'ClientName', 'PriorityLevel', 'RequestedTaskIDs', 'GroupTag', 'AttributesJSON'];
      case 'worker':
        return ['WorkerID', 'WorkerName', 'Skills', 'AvailableSlots', 'MaxLoadPerPhase', 'WorkerGroup', 'QualificationLevel'];
      case 'task':
        return ['TaskID', 'TaskName', 'Category', 'Duration', 'RequiredSkills', 'PreferredPhases', 'MaxConcurrent'];
      default:
        return [];
    }
  }

  private applyFilters(result: any, data: { clients: Client[], workers: Worker[], tasks: Task[] }): string[] {
    const { entityType, filters } = result;
    let targetData: any[] = [];

    switch (entityType) {
      case 'client':
        targetData = data.clients;
        break;
      case 'worker':
        targetData = data.workers;
        break;
      case 'task':
        targetData = data.tasks;
        break;
      default:
        return [];
    }

    return targetData
      .filter(item => {
        return Object.entries(filters || {}).every(([field, value]) => {
          const itemValue = item[field];
          
          if (typeof value === 'string' && value.startsWith('>')) {
            const threshold = parseFloat(value.substring(1));
            return itemValue > threshold;
          }
          
          if (typeof value === 'string' && value.startsWith('<')) {
            const threshold = parseFloat(value.substring(1));
            return itemValue < threshold;
          }
          
          if (Array.isArray(itemValue)) {
            return itemValue.includes(value);
          }
          
          return itemValue === value;
        });
      })
      .map(item => item[`${entityType.charAt(0).toUpperCase() + entityType.slice(1)}ID`]);
  }
}