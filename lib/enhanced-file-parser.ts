import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Client, Worker, Task } from '@/types';
import { OpenAIService } from './openai-service';

export class EnhancedFileParser {
  private static openaiService = new OpenAIService();

  static async parseFile(file: File): Promise<{ data: any[], headers: string[], entityType: string }> {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    let rawData: { data: any[], headers: string[] };
    
    if (extension === 'csv') {
      rawData = await this.parseCSV(file);
    } else if (extension === 'xlsx' || extension === 'xls') {
      rawData = await this.parseXLSX(file);
    } else {
      throw new Error('Unsupported file format. Please use CSV or XLSX files.');
    }

    // Detect entity type
    const entityType = this.detectEntityType(rawData.headers);
    
    // Use AI to map headers if they don't match exactly
    const mappedHeaders = await this.mapHeadersWithAI(rawData.headers, entityType);
    
    // Transform data using mapped headers
    const transformedData = this.transformDataWithMapping(rawData.data, mappedHeaders, entityType);
    
    return {
      data: transformedData,
      headers: Object.keys(mappedHeaders),
      entityType
    };
  }

  private static async mapHeadersWithAI(headers: string[], entityType: string): Promise<Record<string, string>> {
    try {
      const aiResponse = await this.openaiService.parseHeaders(headers, entityType);
      
      if (aiResponse.success && aiResponse.data) {
        // Filter out null mappings and create reverse mapping
        const mapping: Record<string, string> = {};
        Object.entries(aiResponse.data).forEach(([expected, provided]) => {
          if (provided && typeof provided === 'string') {
            mapping[expected] = provided;
          }
        });
        return mapping;
      }
    } catch (error) {
      console.warn('AI header mapping failed, using fallback:', error);
    }
    
    // Fallback to manual mapping
    return this.createFallbackMapping(headers, entityType);
  }

  private static createFallbackMapping(headers: string[], entityType: string): Record<string, string> {
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
    
    return mapping;
  }

  private static transformDataWithMapping(data: any[], mapping: Record<string, string>, entityType: string): any[] {
    return data.map(row => {
      const transformedRow: any = {};
      
      Object.entries(mapping).forEach(([expected, provided]) => {
        transformedRow[expected] = row[provided] || '';
      });
      
      // Apply entity-specific transformations
      return this.transformEntityData(transformedRow, entityType);
    });
  }

  private static transformEntityData(row: any, entityType: string): any {
    switch (entityType) {
      case 'client':
        return this.transformClient(row);
      case 'worker':
        return this.transformWorker(row);
      case 'task':
        return this.transformTask(row);
      default:
        return row;
    }
  }

  private static parseCSV(file: File): Promise<{ data: any[], headers: string[] }> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        complete: (results) => {
          const headers = results.meta.fields || [];
          resolve({
            data: results.data as any[],
            headers
          });
        },
        error: (error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        }
      });
    });
  }

  private static async parseXLSX(file: File): Promise<{ data: any[], headers: string[] }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          
          if (jsonData.length === 0) {
            throw new Error('Empty spreadsheet');
          }
          
          const headers = (jsonData[0] as string[]).map(h => String(h).trim());
          const rows = jsonData.slice(1).map(row => {
            const obj: any = {};
            headers.forEach((header, index) => {
              obj[header] = (row as any[])[index] || '';
            });
            return obj;
          });
          
          resolve({
            data: rows,
            headers
          });
        } catch (error) {
          reject(new Error(`XLSX parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('File reading error'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  private static detectEntityType(headers: string[]): string {
    const headerSet = new Set(headers.map(h => h.toLowerCase()));
    
    // Check for client indicators
    if (headerSet.has('clientid') || headerSet.has('client_id') || 
        headerSet.has('prioritylevel') || headerSet.has('requestedtaskids')) {
      return 'client';
    }
    
    // Check for worker indicators
    if (headerSet.has('workerid') || headerSet.has('worker_id') || 
        headerSet.has('skills') || headerSet.has('availableslots') || 
        headerSet.has('maxloadperphase') || headerSet.has('workergroup')) {
      return 'worker';
    }
    
    // Check for task indicators
    if (headerSet.has('taskid') || headerSet.has('task_id') || 
        headerSet.has('duration') || headerSet.has('requiredskills') || 
        headerSet.has('preferredphases') || headerSet.has('maxconcurrent')) {
      return 'task';
    }
    
    return 'client';
  }

  private static getExpectedHeaders(entityType: string): string[] {
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

  private static transformClient(row: any): Client {
    return {
      ClientID: this.getValue(row, ['ClientID', 'client_id', 'id']),
      ClientName: this.getValue(row, ['ClientName', 'client_name', 'name']),
      PriorityLevel: parseInt(this.getValue(row, ['PriorityLevel', 'priority_level', 'priority'])) || 1,
      RequestedTaskIDs: this.parseArray(this.getValue(row, ['RequestedTaskIDs', 'requested_task_ids', 'tasks'])),
      GroupTag: this.getValue(row, ['GroupTag', 'group_tag', 'group']),
      AttributesJSON: this.getValue(row, ['AttributesJSON', 'attributes_json', 'attributes'])
    };
  }

  private static transformWorker(row: any): Worker {
    return {
      WorkerID: this.getValue(row, ['WorkerID', 'worker_id', 'id']),
      WorkerName: this.getValue(row, ['WorkerName', 'worker_name', 'name']),
      Skills: this.parseArray(this.getValue(row, ['Skills', 'skills'])),
      AvailableSlots: this.parseNumberArray(this.getValue(row, ['AvailableSlots', 'available_slots', 'slots'])),
      MaxLoadPerPhase: parseInt(this.getValue(row, ['MaxLoadPerPhase', 'max_load_per_phase', 'max_load'])) || 1,
      WorkerGroup: this.getValue(row, ['WorkerGroup', 'worker_group', 'group']),
      QualificationLevel: parseInt(this.getValue(row, ['QualificationLevel', 'qualification_level', 'level'])) || 1
    };
  }

  private static transformTask(row: any): Task {
    return {
      TaskID: this.getValue(row, ['TaskID', 'task_id', 'id']),
      TaskName: this.getValue(row, ['TaskName', 'task_name', 'name']),
      Category: this.getValue(row, ['Category', 'category']),
      Duration: parseInt(this.getValue(row, ['Duration', 'duration'])) || 1,
      RequiredSkills: this.parseArray(this.getValue(row, ['RequiredSkills', 'required_skills', 'skills'])),
      PreferredPhases: this.parsePhases(this.getValue(row, ['PreferredPhases', 'preferred_phases', 'phases'])),
      MaxConcurrent: parseInt(this.getValue(row, ['MaxConcurrent', 'max_concurrent', 'concurrent'])) || 1
    };
  }

  private static getValue(row: any, keys: string[]): string {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null) {
        return String(row[key]).trim();
      }
    }
    return '';
  }

  private static parseArray(value: string): string[] {
    if (!value) return [];
    
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(String);
      }
    } catch {
      // Fallback to comma-separated
    }
    
    return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
  }

  private static parseNumberArray(value: string): number[] {
    if (!value) return [];
    
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(Number).filter(n => !isNaN(n));
      }
    } catch {
      // Fallback to comma-separated
    }
    
    return value.split(',')
      .map(item => parseInt(item.trim()))
      .filter(n => !isNaN(n));
  }

  private static parsePhases(value: string): number[] | string {
    if (!value) return [];
    
    if (/^\d+-\d+$/.test(value)) {
      return value;
    }
    
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(Number).filter(n => !isNaN(n));
      }
    } catch {
      // Fallback to comma-separated
    }
    
    const numbers = value.split(',')
      .map(item => parseInt(item.trim()))
      .filter(n => !isNaN(n));
    
    return numbers.length > 0 ? numbers : value;
  }
}