'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ValidationError } from '@/types';
import { 
  Edit2, 
  Save, 
  X, 
  AlertTriangle, 
  AlertCircle, 
  Info,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface VirtualizedTableProps {
  data: any[];
  headers: string[];
  entityType: string;
  validationErrors: ValidationError[];
  onDataChange: (index: number, field: string, value: any) => void;
  onValidate: () => void;
}

interface RowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    items: any[];
    headers: string[];
    entityType: string;
    validationErrors: ValidationError[];
    onDataChange: (index: number, field: string, value: any) => void;
    editingCell: { row: number; col: string } | null;
    setEditingCell: (cell: { row: number; col: string } | null) => void;
    editValue: string;
    setEditValue: (value: string) => void;
    startEditing: (rowIndex: number, column: string, currentValue: any) => void;
    saveEdit: () => void;
    cancelEdit: () => void;
    getCellErrors: (rowIndex: number, field: string) => ValidationError[];
    getRowErrors: (rowIndex: number) => ValidationError[];
    formatCellValue: (value: any) => string;
    getErrorIcon: (type: string) => JSX.Element;
  };
}

const Row = ({ index, style, data }: RowProps) => {
  const {
    items,
    headers,
    entityType,
    validationErrors,
    onDataChange,
    editingCell,
    setEditingCell,
    editValue,
    setEditValue,
    startEditing,
    saveEdit,
    cancelEdit,
    getCellErrors,
    getRowErrors,
    formatCellValue,
    getErrorIcon
  } = data;

  const row = items[index];
  const rowErrors = getRowErrors(index);
  const hasErrors = rowErrors.length > 0;

  return (
    <div
      style={style}
      className={`flex border-b border-gray-200 hover:bg-gray-50 ${hasErrors ? 'bg-red-50' : ''}`}
    >
      <div className="w-12 p-3 text-sm text-gray-500 border-r flex items-center justify-center">
        {index + 1}
      </div>
      {headers.map((header) => {
        const cellErrors = getCellErrors(index, header);
        const isEditing = editingCell?.row === index && editingCell?.col === header;
        const cellValue = row[header];
        
        return (
          <div
            key={header}
            className={`min-w-[150px] p-3 text-sm border-r relative flex-1 ${
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
                onClick={() => startEditing(index, header, cellValue)}
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
          </div>
        );
      })}
      <div className="w-20 p-3 text-center flex items-center justify-center">
        {rowErrors.length > 0 && (
          <Badge
            variant={rowErrors.some(e => e.type === 'error') ? 'destructive' : 'secondary'}
            className="text-xs"
          >
            {rowErrors.length}
          </Badge>
        )}
      </div>
    </div>
  );
};

export function VirtualizedTable({ 
  data, 
  headers, 
  entityType, 
  validationErrors, 
  onDataChange,
  onValidate 
}: VirtualizedTableProps) {
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100; // Increased for virtualization
  const itemHeight = 60;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = data.slice(startIndex, endIndex);
  const totalPages = Math.ceil(data.length / itemsPerPage);

  useEffect(() => {
    onValidate();
  }, [data]);

  const startEditing = useCallback((rowIndex: number, column: string, currentValue: any) => {
    setEditingCell({ row: rowIndex, col: column });
    setEditValue(Array.isArray(currentValue) ? currentValue.join(', ') : String(currentValue || ''));
  }, []);

  const saveEdit = useCallback(() => {
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
  }, [editingCell, editValue, onDataChange, startIndex]);

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditValue('');
  }, []);

  const getCellErrors = useCallback((rowIndex: number, field: string): ValidationError[] => {
    const actualRowIndex = startIndex + rowIndex;
    return validationErrors.filter(
      error => error.rowIndex === actualRowIndex && 
               error.field === field &&
               error.entity === entityType
    );
  }, [validationErrors, entityType, startIndex]);

  const getRowErrors = useCallback((rowIndex: number): ValidationError[] => {
    const actualRowIndex = startIndex + rowIndex;
    return validationErrors.filter(
      error => error.rowIndex === actualRowIndex && error.entity === entityType
    );
  }, [validationErrors, entityType, startIndex]);

  const formatCellValue = useCallback((value: any): string => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    return String(value || '');
  }, []);

  const getErrorIcon = useCallback((type: string) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  }, []);

  const rowData = useMemo(() => ({
    items: paginatedData,
    headers,
    entityType,
    validationErrors,
    onDataChange,
    editingCell,
    setEditingCell,
    editValue,
    setEditValue,
    startEditing,
    saveEdit,
    cancelEdit,
    getCellErrors,
    getRowErrors,
    formatCellValue,
    getErrorIcon
  }), [
    paginatedData,
    headers,
    entityType,
    validationErrors,
    onDataChange,
    editingCell,
    editValue,
    startEditing,
    saveEdit,
    cancelEdit,
    getCellErrors,
    getRowErrors,
    formatCellValue,
    getErrorIcon
  ]);

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
        <div className="border-b border-gray-200">
          {/* Header */}
          <div className="flex bg-gray-50 sticky top-0 z-10">
            <div className="w-12 p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
              #
            </div>
            {headers.map((header) => (
              <div
                key={header}
                className="min-w-[150px] p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r flex-1"
              >
                {header}
              </div>
            ))}
            <div className="w-20 p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Issues
            </div>
          </div>
        </div>
        
        {/* Virtualized Rows */}
        <List
          height={Math.min(600, paginatedData.length * itemHeight)}
          itemCount={paginatedData.length}
          itemSize={itemHeight}
          itemData={rowData}
          width="100%"
        >
          {Row}
        </List>
      </CardContent>
    </Card>
  );
}