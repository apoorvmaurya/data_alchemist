import OpenAI from 'openai';
import { Client, Worker, Task, ValidationError, BusinessRule, AIResponse } from '@/types';

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    
    if (!apiKey || apiKey.startsWith('sk-') === false) {
  throw new Error('NEXT_PUBLIC_OPENAI_API_KEY is not configured properly');
}
    
    this.openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true
    });
  }

  async parseHeaders(headers: string[], entityType: string): Promise<AIResponse> {
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

      const response = await this.openai.chat.completions.create({
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
        message: 'Headers mapped successfully'
      };
    } catch (error) {
      console.error('OpenAI header mapping error:', error);
      return {
        success: false,
        message: 'Failed to map headers with AI'
      };
    }
  }

  async validateDataWithAI(data: any[], entityType: string): Promise<AIResponse> {
    try {
      const sampleData = data.slice(0, 5); // Analyze first 5 rows
      
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

      const response = await this.openai.chat.completions.create({
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

      const response = await this.openai.chat.completions.create({
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
        message: result.explanation || 'Query processed successfully'
      };
    } catch (error) {
      console.error('OpenAI search error:', error);
      return {
        success: false,
        message: 'Search query could not be processed'
      };
    }
  }

  async suggestDataModifications(query: string, data: any[], entityType: string): Promise<AIResponse> {
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

      const response = await this.openai.chat.completions.create({
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

      const response = await this.openai.chat.completions.create({
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

      const response = await this.openai.chat.completions.create({
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
        message: 'Rule generated successfully'
      };
    } catch (error) {
      console.error('OpenAI rule generation error:', error);
      return {
        success: false,
        message: 'Could not generate rule'
      };
    }
  }

  async recommendRules(data: { clients: Client[], workers: Worker[], tasks: Task[] }): Promise<AIResponse> {
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

      const response = await this.openai.chat.completions.create({
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
        message: `Generated ${recommendations.length} rule recommendations`
      };
    } catch (error) {
      console.error('OpenAI rule recommendation error:', error);
      return {
        success: false,
        message: 'Could not generate rule recommendations'
      };
    }
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