'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { ValidationError } from '@/types';
import { VirtualizedTable } from './virtualized-table';
import { 
  Edit2, 
  Save, 
  X, 
  AlertTriangle, 
  AlertCircle, 
  Info,
  ChevronLeft,
  ChevronRight,
  Zap,
  Table,
  Grid
} from 'lucide-react';

interface DataTableProps {
  data: any[];
  headers: string[];
  entityType: string;
  validationErrors: ValidationError[];
  onDataChange: (index: number, field: string, value: any) => void;
  onValidate: () => void;
}

export function DataTable({ 
  data, 
  headers, 
  entityType, 
  validationErrors, 
  onDataChange,
  onValidate 
}: DataTableProps) {
  const [useVirtualization, setUseVirtualization] = useState(false);
  const [useMobileView, setUseMobileView] = useState(false);
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = data.slice(startIndex, endIndex);
  const totalPages = Math.ceil(data.length / itemsPerPage);

  // Use virtualization for large datasets
  useEffect(() => {
    setUseVirtualization(data.length > 100);
  }, [data.length]);

  // Detect mobile view
  useEffect(() => {
    const checkMobile = () => {
      setUseMobileView(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    onValidate();
  }, [data]);

  const startEditing = (rowIndex: number, column: string, currentValue: any) => {
    setEditingCell({ row: rowIndex, col: column });
    setEditValue(Array.isArray(currentValue) ? currentValue.join(', ') : String(currentValue || ''));
  };

  const saveEdit = () => {
    if (editingCell) {
      const { row, col } = editingCell;
      const actualRowIndex = startIndex + row;
      
      let processedValue: any = editValue;
      
      // Process array fields
      if (col === 'RequestedTaskIDs' || col === 'Skills' || col === 'RequiredSkills') {
        processedValue = editValue.split(',').map(s => s.trim()).filter(s => s.length > 0);
      } else if (col === 'AvailableSlots' || col === 'PreferredPhases') {
        try {
          processedValue = JSON.parse(editValue);
        } catch {
          processedValue = editValue.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        }
      } else if (col === 'PriorityLevel' || col === 'Duration' || col === 'MaxConcurrent' || col === 'MaxLoadPerPhase' || col === 'QualificationLevel') {
        processedValue = parseInt(editValue) || 0;
      }
      
      onDataChange(actualRowIndex, col, processedValue);
      setEditingCell(null);
      setEditValue('');
    }
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const getCellErrors = (rowIndex: number, field: string): ValidationError[] => {
    const actualRowIndex = startIndex + rowIndex;
    return validationErrors.filter(
      error => error.rowIndex === actualRowIndex && 
               error.field === field &&
               error.entity === entityType
    );
  };

  const getRowErrors = (rowIndex: number): ValidationError[] => {
    const actualRowIndex = startIndex + rowIndex;
    return validationErrors.filter(
      error => error.rowIndex === actualRowIndex && error.entity === entityType
    );
  };

  const formatCellValue = (value: any): string => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    return String(value || '');
  };

  const getErrorIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />;
      default:
        return <Info className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />;
    }
  };

  // Use virtualized table for large datasets
  if (useVirtualization) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Zap className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-gray-600">
              Using virtualized rendering for optimal performance
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUseVirtualization(false)}
            className="responsive-button"
          >
            <Table className="h-4 w-4 mr-2" />
            Switch to Standard View
          </Button>
        </div>
        <VirtualizedTable
          data={data}
          headers={headers}
          entityType={entityType}
          validationErrors={validationErrors}
          onDataChange={onDataChange}
          onValidate={onValidate}
        />
      </div>
    );
  }

  // Mobile card view
  if (useMobileView) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg sm:text-xl font-semibold capitalize">
            {entityType}s ({data.length})
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUseMobileView(false)}
            >
              <Grid className="h-4 w-4" />
            </Button>
            {data.length > 100 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUseVirtualization(true)}
              >
                <Zap className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Pagination */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Mobile Cards */}
          <div className="space-y-4">
            {paginatedData.map((row, rowIndex) => {
              const rowErrors = getRowErrors(rowIndex);
              const hasErrors = rowErrors.length > 0;
              
              return (
                <div
                  key={startIndex + rowIndex}
                  className={`apple-card p-4 ${hasErrors ? 'border-red-200 bg-red-50' : ''}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-500">
                      Record #{startIndex + rowIndex + 1}
                    </span>
                    {rowErrors.length > 0 && (
                      <Badge
                        variant={rowErrors.some(e => e.type === 'error') ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {rowErrors.length} issues
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {headers.map((header) => {
                      const cellErrors = getCellErrors(rowIndex, header);
                      const isEditing = editingCell?.row === rowIndex && editingCell?.col === header;
                      const cellValue = row[header];
                      
                      return (
                        <div key={header} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700">
                              {header}
                            </label>
                            {cellErrors.length > 0 && (
                              <div className="flex space-x-1">
                                {cellErrors.map((error) => (
                                  <div
                                    key={error.id}
                                    title={error.message}
                                    className="cursor-help"
                                  >
                                    {getErrorIcon(error.type)}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          {isEditing ? (
                            <div className="flex items-center space-x-2">
                              {header === 'AttributesJSON' ? (
                                <Textarea
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="min-h-[60px] text-xs"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.ctrlKey) {
                                      saveEdit();
                                    } else if (e.key === 'Escape') {
                                      cancelEdit();
                                    }
                                  }}
                                />
                              ) : (
                                <Input
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="text-sm"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      saveEdit();
                                    } else if (e.key === 'Escape') {
                                      cancelEdit();
                                    }
                                  }}
                                  autoFocus
                                />
                              )}
                              <div className="flex space-x-1">
                                <Button size="sm" variant="ghost" onClick={saveEdit}>
                                  <Save className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="group cursor-pointer flex items-center justify-between p-2 rounded border border-gray-200 hover:border-gray-300 transition-colors"
                              onClick={() => startEditing(rowIndex, header, cellValue)}
                            >
                              <span className="text-sm text-gray-900 break-words">
                                {formatCellValue(cellValue) || 'Empty'}
                              </span>
                              <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Desktop table view
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-semibold capitalize">
          {entityType}s ({data.length} records)
        </CardTitle>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUseMobileView(true)}
            className="sm:hidden"
          >
            <Grid className="h-4 w-4" />
          </Button>
          {data.length > 100 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUseVirtualization(true)}
            >
              <Zap className="h-4 w-4 mr-2" />
              Enable Virtualization
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          <div className="responsive-overflow">
            <table className="w-full border-collapse min-w-[800px]">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="w-12 p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    #
                  </th>
                  {headers.map((header) => (
                    <th
                      key={header}
                      className="min-w-[150px] p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b"
                    >
                      {header}
                    </th>
                  ))}
                  <th className="w-20 p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Issues
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedData.map((row, rowIndex) => {
                  const rowErrors = getRowErrors(rowIndex);
                  const hasErrors = rowErrors.length > 0;
                  
                  return (
                    <tr
                      key={startIndex + rowIndex}
                      className={`hover:bg-gray-50 ${hasErrors ? 'bg-red-50' : ''}`}
                    >
                      <td className="p-3 text-sm text-gray-500 border-r">
                        {startIndex + rowIndex + 1}
                      </td>
                      {headers.map((header) => {
                        const cellErrors = getCellErrors(rowIndex, header);
                        const isEditing = editingCell?.row === rowIndex && editingCell?.col === header;
                        const cellValue = row[header];
                        
                        return (
                          <td
                            key={header}
                            className={`p-3 text-sm border-r relative ${
                              cellErrors.length > 0 ? 'bg-red-100' : ''
                            }`}
                          >
                            {isEditing ? (
                              <div className="flex items-center space-x-2">
                                {header === 'AttributesJSON' ? (
                                  <Textarea
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="min-h-[60px] text-xs"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && e.ctrlKey) {
                                        saveEdit();
                                      } else if (e.key === 'Escape') {
                                        cancelEdit();
                                      }
                                    }}
                                  />
                                ) : (
                                  <Input
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="text-xs"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        saveEdit();
                                      } else if (e.key === 'Escape') {
                                        cancelEdit();
                                      }
                                    }}
                                    autoFocus
                                  />
                                )}
                                <div className="flex space-x-1">
                                  <Button size="sm" variant="ghost" onClick={saveEdit}>
                                    <Save className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div
                                className="group cursor-pointer flex items-center justify-between"
                                onClick={() => startEditing(rowIndex, header, cellValue)}
                              >
                                <span className="truncate max-w-[200px]" title={formatCellValue(cellValue)}>
                                  {formatCellValue(cellValue)}
                                </span>
                                <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            )}
                            
                            {cellErrors.length > 0 && (
                              <div className="absolute top-1 right-1 flex space-x-1">
                                {cellErrors.map((error) => (
                                  <div
                                    key={error.id}
                                    title={error.message}
                                    className="cursor-help"
                                  >
                                    {getErrorIcon(error.type)}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="p-3 text-center">
                        {rowErrors.length > 0 && (
                          <Badge
                            variant={rowErrors.some(e => e.type === 'error') ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {rowErrors.length}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}