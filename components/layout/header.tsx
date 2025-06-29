'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Upload, 
  Download, 
  Settings, 
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Zap
} from 'lucide-react';

interface HeaderProps {
  onFileUpload: (files: FileList) => void;
  onExport: () => void;
  onAISearch: (query: string) => void;
  validationCount: {
    errors: number;
    warnings: number;
    info: number;
  };
  isDataLoaded: boolean;
}

export function Header({ 
  onFileUpload, 
  onExport, 
  onAISearch, 
  validationCount, 
  isDataLoaded 
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onFileUpload(files);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      onAISearch(searchQuery);
    }
  };

  const totalIssues = validationCount.errors + validationCount.warnings;

  return (
    <header className="apple-nav px-6 py-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Sparkles className="h-8 w-8 text-blue-600" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gradient font-sans">Data Alchemist</h1>
              <p className="text-xs text-gray-500 font-medium">AI-Powered Resource Allocation</p>
            </div>
          </div>
          
          {isDataLoaded && (
            <div className="flex items-center space-x-3">
              {validationCount.errors > 0 && (
                <Badge variant="destructive" className="flex items-center space-x-1 rounded-full px-3 py-1">
                  <AlertCircle className="h-3 w-3" />
                  <span className="font-medium">{validationCount.errors} errors</span>
                </Badge>
              )}
              {validationCount.warnings > 0 && (
                <Badge variant="secondary" className="flex items-center space-x-1 rounded-full px-3 py-1 bg-amber-100 text-amber-800 border-amber-200">
                  <AlertCircle className="h-3 w-3" />
                  <span className="font-medium">{validationCount.warnings} warnings</span>
                </Badge>
              )}
              {totalIssues === 0 && (
                <Badge className="flex items-center space-x-1 rounded-full px-3 py-1 bg-emerald-100 text-emerald-800 border-emerald-200">
                  <CheckCircle2 className="h-3 w-3" />
                  <span className="font-medium">All validated</span>
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {isDataLoaded && (
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Input
                  placeholder="Ask AI: 'tasks with duration > 2 phases'"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="apple-input w-80 pl-10"
                />
                <Zap className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-500" />
              </div>
              <Button onClick={handleSearch} size="sm" className="apple-button h-12 px-4">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex items-center space-x-3">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button asChild variant="outline" className="h-12 px-4 rounded-xl border-gray-200 bg-white/50 backdrop-blur-sm hover:bg-white/80 transition-all duration-200">
                <span className="cursor-pointer flex items-center space-x-2">
                  <Upload className="h-4 w-4" />
                  <span className="font-medium">Upload Files</span>
                </span>
              </Button>
            </label>

            <Button 
              onClick={onExport} 
              disabled={!isDataLoaded || totalIssues > 0}
              className="apple-button h-12 px-6"
            >
              <Download className="h-4 w-4 mr-2" />
              <span className="font-medium">Export</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}