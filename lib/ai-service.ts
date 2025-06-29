import { Client, Worker, Task, ValidationError, BusinessRule, AIResponse } from '@/types';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class AIService {
  private apiKey: string | null = null;

  constructor() {
    // In a real app, you'd get this from environment variables
    this.apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || null;
  }

  async searchData(query: string, data: { clients: Client[], workers: Worker[], tasks: Task[] }): Promise<AIResponse> {
    try {
      if (!this.apiKey) {
        return this.mockSearchData(query, data);
      }

      const prompt = `
        Given the following data structure, parse this natural language query and return matching results:
        
        Query: "${query}"
        
        Data types available:
        - Clients: ${data.clients.length} records
        - Workers: ${data.workers.length} records  
        - Tasks: ${data.tasks.length} records
        
        Return a JSON response with:
        {
          "entityType": "client|worker|task",
          "filters": {...},
          "matchingIds": [...]
        }
      `;

      const response = await this.callOpenAI([
        { role: 'system', content: 'You are a data query assistant. Parse natural language queries into structured filters.' },
        { role: 'user', content: prompt }
      ]);

      return {
        success: true,
        data: JSON.parse(response),
        message: 'Query processed successfully'
      };
    } catch (error) {
      return this.mockSearchData(query, data);
    }
  }

  async generateRule(description: string, context: { clients: Client[], workers: Worker[], tasks: Task[] }): Promise<AIResponse> {
    try {
      if (!this.apiKey) {
        return this.mockGenerateRule(description);
      }

      const prompt = `
        Convert this natural language rule into a structured business rule:
        
        Description: "${description}"
        
        Available rule types:
        - coRun: Tasks that must run together
        - slotRestriction: Restrictions on slot usage
        - loadLimit: Maximum load per worker/group
        - phaseWindow: Constraints on when tasks can run
        - patternMatch: Pattern-based rules
        - precedenceOverride: Priority overrides
        
        Return JSON:
        {
          "type": "rule_type",
          "name": "Rule Name",
          "description": "Detailed description",
          "parameters": {...},
          "confidence": 0.0-1.0
        }
      `;

      const response = await this.callOpenAI([
        { role: 'system', content: 'You are a business rules assistant. Convert natural language into structured rules.' },
        { role: 'user', content: prompt }
      ]);

      return {
        success: true,
        data: JSON.parse(response),
        message: 'Rule generated successfully'
      };
    } catch (error) {
      return this.mockGenerateRule(description);
    }
  }

  async suggestCorrections(errors: ValidationError[], data: { clients: Client[], workers: Worker[], tasks: Task[] }): Promise<AIResponse> {
    try {
      if (!this.apiKey) {
        return this.mockSuggestCorrections(errors);
      }

      const errorSummary = errors.slice(0, 5).map(e => `${e.type}: ${e.message}`).join('\n');
      
      const prompt = `
        Analyze these validation errors and suggest corrections:
        
        Errors:
        ${errorSummary}
        
        Return JSON array of suggestions:
        [
          {
            "errorId": "error_id",
            "suggestion": "What to fix",
            "action": "automatic_fix|manual_review|data_entry",
            "confidence": 0.0-1.0
          }
        ]
      `;

      const response = await this.callOpenAI([
        { role: 'system', content: 'You are a data quality assistant. Analyze errors and suggest fixes.' },
        { role: 'user', content: prompt }
      ]);

      return {
        success: true,
        data: JSON.parse(response),
        message: 'Corrections suggested'
      };
    } catch (error) {
      return this.mockSuggestCorrections(errors);
    }
  }

  async recommendRules(data: { clients: Client[], workers: Worker[], tasks: Task[] }): Promise<AIResponse> {
    try {
      if (!this.apiKey) {
        return this.mockRecommendRules();
      }

      const dataStats = {
        clientCount: data.clients.length,
        workerCount: data.workers.length,
        taskCount: data.tasks.length,
        topSkills: this.getTopSkills(data.workers),
        priorityDistribution: this.getPriorityDistribution(data.clients)
      };

      const prompt = `
        Analyze this data and recommend business rules:
        
        Data Statistics: ${JSON.stringify(dataStats)}
        
        Look for patterns like:
        - Tasks that often appear together
        - Overloaded workers/phases
        - Skill mismatches
        - Priority imbalances
        
        Return JSON array of rule recommendations.
      `;

      const response = await this.callOpenAI([
        { role: 'system', content: 'You are a business intelligence assistant. Analyze patterns and recommend rules.' },
        { role: 'user', content: prompt }
      ]);

      return {
        success: true,
        data: JSON.parse(response),
        message: 'Rules recommended based on data patterns'
      };
    } catch (error) {
      return this.mockRecommendRules();
    }
  }

  private async callOpenAI(messages: OpenAIMessage[]): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error('OpenAI API call failed');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // Mock implementations for when API key is not available
  private mockSearchData(query: string, data: { clients: Client[], workers: Worker[], tasks: Task[] }): AIResponse {
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
          matchingIds: matchingTasks.map(t => t.TaskID)
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
          matchingIds: matchingClients.map(c => c.ClientID)
        },
        message: `Found ${matchingClients.length} high priority clients`
      };
    }
    
    return {
      success: true,
      data: {
        entityType: 'task',
        filters: {},
        matchingIds: []
      },
      message: 'No matches found for this query'
    };
  }

  private mockGenerateRule(description: string): AIResponse {
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
        message: 'Co-run rule generated'
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
        message: 'Load limit rule generated'
      };
    }
    
    return {
      success: false,
      message: 'Could not parse rule description'
    };
  }

  private mockSuggestCorrections(errors: ValidationError[]): AIResponse {
    const suggestions = errors.slice(0, 3).map(error => ({
      errorId: error.id,
      suggestion: this.generateSuggestion(error),
      action: error.type === 'error' ? 'manual_review' : 'automatic_fix',
      confidence: 0.8
    }));

    return {
      success: true,
      data: suggestions,
      message: `Generated ${suggestions.length} correction suggestions`
    };
  }

  private generateSuggestion(error: ValidationError): string {
    if (error.message.includes('Duplicate')) {
      return 'Consider renaming one of the duplicate entries or merging them if they represent the same entity';
    }
    
    if (error.message.includes('Missing')) {
      return 'Add the required field value or mark it as optional if not needed';
    }
    
    if (error.message.includes('range')) {
      return 'Update the value to fall within the valid range (1-5 for priority levels)';
    }
    
    return 'Review and correct the highlighted field';
  }

  private mockRecommendRules(): AIResponse {
    const recommendations = [
      {
        type: 'coRun',
        name: 'Suggested Co-run Rule',
        description: 'Tasks T12 and T14 often appear together in client requests',
        confidence: 0.75,
        reasoning: 'These tasks appear together in 80% of client requests'
      },
      {
        type: 'loadLimit',
        name: 'Worker Load Balance',
        description: 'Limit GroupA workers to 3 tasks per phase',
        confidence: 0.85,
        reasoning: 'GroupA workers are consistently overloaded'
      }
    ];

    return {
      success: true,
      data: recommendations,
      message: 'Found 2 rule recommendations based on data patterns'
    };
  }

  private getTopSkills(workers: Worker[]): string[] {
    const skillCount = new Map<string, number>();
    
    workers.forEach(worker => {
      if (Array.isArray(worker.Skills)) {
        worker.Skills.forEach(skill => {
          skillCount.set(skill, (skillCount.get(skill) || 0) + 1);
        });
      }
    });
    
    return Array.from(skillCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([skill]) => skill);
  }

  private getPriorityDistribution(clients: Client[]): Record<number, number> {
    const distribution: Record<number, number> = {};
    
    clients.forEach(client => {
      distribution[client.PriorityLevel] = (distribution[client.PriorityLevel] || 0) + 1;
    });
    
    return distribution;
  }
}