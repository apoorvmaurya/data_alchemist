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
  Zap,
  Menu,
  X
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    <header className="apple-nav">
      <div className="responsive-container">
        <div className="flex items-center justify-between py-3 sm:py-4">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3 sm:space-x-6">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="relative">
                <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gradient font-sans">
                  <span className="hidden sm:inline">Data Alchemist</span>
                  <span className="sm:hidden">Alchemist</span>
                </h1>
                <p className="text-xs text-gray-500 font-medium hidden sm:block">
                  AI-Powered Resource Allocation
                </p>
              </div>
            </div>
            
            {/* Validation Status - Desktop */}
            {isDataLoaded && (
              <div className="hidden lg:flex items-center space-x-3">
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

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center space-x-4">
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

          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="touch-target"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Validation Status */}
        {isDataLoaded && (
          <div className="flex lg:hidden items-center space-x-2 pb-3 overflow-x-auto">
            {validationCount.errors > 0 && (
              <Badge variant="destructive" className="flex items-center space-x-1 rounded-full px-2 py-1 text-xs whitespace-nowrap">
                <AlertCircle className="h-3 w-3" />
                <span>{validationCount.errors} errors</span>
              </Badge>
            )}
            {validationCount.warnings > 0 && (
              <Badge variant="secondary" className="flex items-center space-x-1 rounded-full px-2 py-1 text-xs bg-amber-100 text-amber-800 border-amber-200 whitespace-nowrap">
                <AlertCircle className="h-3 w-3" />
                <span>{validationCount.warnings} warnings</span>
              </Badge>
            )}
            {totalIssues === 0 && (
              <Badge className="flex items-center space-x-1 rounded-full px-2 py-1 text-xs bg-emerald-100 text-emerald-800 border-emerald-200 whitespace-nowrap">
                <CheckCircle2 className="h-3 w-3" />
                <span>All validated</span>
              </Badge>
            )}
          </div>
        )}

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200/60 pt-4 pb-4 space-y-4 animate-slide-up">
            {/* Mobile Search */}
            {isDataLoaded && (
              <div className="space-y-3">
                <div className="relative">
                  <Input
                    placeholder="Ask AI about your data..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="apple-input pl-10"
                  />
                  <Zap className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-500" />
                </div>
                <Button 
                  onClick={handleSearch} 
                  className="w-full apple-button"
                  disabled={!searchQuery.trim()}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search with AI
                </Button>
              </div>
            )}

            {/* Mobile Actions */}
            <div className="space-y-3">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="mobile-file-upload"
              />
              <label htmlFor="mobile-file-upload" className="block">
                <Button asChild variant="outline" className="w-full h-12 rounded-xl border-gray-200 bg-white/50 backdrop-blur-sm">
                  <span className="cursor-pointer flex items-center justify-center space-x-2">
                    <Upload className="h-4 w-4" />
                    <span className="font-medium">Upload Files</span>
                  </span>
                </Button>
              </label>

              <Button 
                onClick={onExport} 
                disabled={!isDataLoaded || totalIssues > 0}
                className="w-full apple-button h-12"
              >
                <Download className="h-4 w-4 mr-2" />
                <span className="font-medium">Export Data</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}