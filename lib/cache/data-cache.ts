import { Client, Worker, Task, ValidationError } from '@/types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class DataCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Specific cache methods for common operations
  cacheValidationResults(dataHash: string, errors: ValidationError[]): void {
    this.set(`validation:${dataHash}`, errors, 10 * 60 * 1000); // 10 minutes
  }

  getCachedValidationResults(dataHash: string): ValidationError[] | null {
    return this.get(`validation:${dataHash}`);
  }

  cacheAIResponse(queryHash: string, response: any): void {
    this.set(`ai:${queryHash}`, response, 30 * 60 * 1000); // 30 minutes
  }

  getCachedAIResponse(queryHash: string): any | null {
    return this.get(`ai:${queryHash}`);
  }

  // Generate hash for data to use as cache key
  generateDataHash(data: any): string {
    return btoa(JSON.stringify(data)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
  }
}

export const dataCache = new DataCache();