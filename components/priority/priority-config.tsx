'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PriorityWeights } from '@/types';
import { 
  Target, 
  Scale, 
  Users, 
  Zap,
  Award,
  Clock,
  RotateCcw
} from 'lucide-react';

interface PriorityConfigProps {
  weights: PriorityWeights;
  onWeightsChange: (weights: PriorityWeights) => void;
}

export function PriorityConfig({ weights, onWeightsChange }: PriorityConfigProps) {
  const [preset, setPreset] = useState<string>('custom');

  const presets = {
    custom: { name: 'Custom', description: 'User-defined weights' },
    fulfillment: { 
      name: 'Maximize Fulfillment', 
      description: 'Focus on completing as many requested tasks as possible',
      weights: { priorityLevel: 30, taskFulfillment: 40, fairness: 10, workloadBalance: 10, skillMatching: 5, phaseOptimization: 5 }
    },
    fairness: { 
      name: 'Fair Distribution', 
      description: 'Ensure equal treatment across all clients and workers',
      weights: { priorityLevel: 15, taskFulfillment: 20, fairness: 35, workloadBalance: 20, skillMatching: 5, phaseOptimization: 5 }
    },
    efficiency: { 
      name: 'Minimize Workload', 
      description: 'Optimize for minimal resource usage and maximum efficiency',
      weights: { priorityLevel: 20, taskFulfillment: 15, fairness: 10, workloadBalance: 30, skillMatching: 15, phaseOptimization: 10 }
    },
    quality: { 
      name: 'Quality First', 
      description: 'Prioritize skill matching and optimal phase timing',
      weights: { priorityLevel: 15, taskFulfillment: 15, fairness: 10, workloadBalance: 15, skillMatching: 25, phaseOptimization: 20 }
    }
  };

  const criteriaConfig = [
    {
      key: 'priorityLevel' as keyof PriorityWeights,
      label: 'Priority Level',
      description: 'How much client priority levels matter',
      icon: Target,
      color: 'text-red-600'
    },
    {
      key: 'taskFulfillment' as keyof PriorityWeights,
      label: 'Task Fulfillment',
      description: 'Importance of completing requested tasks',
      icon: Award,
      color: 'text-blue-600'
    },
    {
      key: 'fairness' as keyof PriorityWeights,
      label: 'Fairness',
      description: 'Equal treatment across clients and workers',
      icon: Scale,
      color: 'text-green-600'
    },
    {
      key: 'workloadBalance' as keyof PriorityWeights,
      label: 'Workload Balance',
      description: 'Even distribution of work across workers',
      icon: Users,
      color: 'text-purple-600'
    },
    {
      key: 'skillMatching' as keyof PriorityWeights,
      label: 'Skill Matching',
      description: 'Assigning tasks to best-qualified workers',
      icon: Zap,
      color: 'text-yellow-600'
    },
    {
      key: 'phaseOptimization' as keyof PriorityWeights,
      label: 'Phase Optimization',
      description: 'Optimal timing and phase utilization',
      icon: Clock,
      color: 'text-indigo-600'
    }
  ];

  const handleSliderChange = (key: keyof PriorityWeights, value: number[]) => {
    const newWeights = { ...weights, [key]: value[0] };
    onWeightsChange(newWeights);
    setPreset('custom');
  };

  const applyPreset = (presetKey: string) => {
    if (presetKey !== 'custom' && presets[presetKey as keyof typeof presets]) {
      const presetData = presets[presetKey as keyof typeof presets];
      if ('weights' in presetData) {
        onWeightsChange(presetData.weights);
      }
    }
    setPreset(presetKey);
  };

  const resetWeights = () => {
    const equalWeights = {
      priorityLevel: 17,
      taskFulfillment: 17,
      fairness: 17,
      workloadBalance: 17,
      skillMatching: 16,
      phaseOptimization: 16
    };
    onWeightsChange(equalWeights);
    setPreset('custom');
  };

  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Priority Configuration</CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant={totalWeight === 100 ? 'default' : 'destructive'}>
              Total: {totalWeight}%
            </Badge>
            <Button onClick={resetWeights} size="sm" variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Preset Selection */}
        <div>
          <Label htmlFor="preset">Quick Presets</Label>
          <Select value={preset} onValueChange={applyPreset}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(presets).map(([key, preset]) => (
                <SelectItem key={key} value={key}>
                  <div>
                    <div className="font-medium">{preset.name}</div>
                    <div className="text-xs text-gray-500">{preset.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Weight Sliders */}
        <div className="space-y-6">
          <h4 className="font-medium text-sm text-gray-700">Criteria Weights</h4>
          {criteriaConfig.map((criteria) => {
            const Icon = criteria.icon;
            const currentWeight = weights[criteria.key];
            
            return (
              <div key={criteria.key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Icon className={`h-5 w-5 ${criteria.color}`} />
                    <div>
                      <Label className="font-medium">{criteria.label}</Label>
                      <p className="text-xs text-gray-500">{criteria.description}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    {currentWeight}%
                  </Badge>
                </div>
                
                <Slider
                  value={[currentWeight]}
                  onValueChange={(value) => handleSliderChange(criteria.key, value)}
                  max={50}
                  min={0}
                  step={1}
                  className="w-full"
                />
              </div>
            );
          })}
        </div>

        {/* Weight Distribution Visualization */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-gray-700">Weight Distribution</h4>
          <div className="space-y-2">
            {criteriaConfig.map((criteria) => {
              const weight = weights[criteria.key];
              const percentage = totalWeight > 0 ? (weight / totalWeight) * 100 : 0;
              
              return (
                <div key={criteria.key} className="flex items-center space-x-3">
                  <div className="w-20 text-xs font-medium">{criteria.label}</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        criteria.key === 'priorityLevel' ? 'bg-red-500' :
                        criteria.key === 'taskFulfillment' ? 'bg-blue-500' :
                        criteria.key === 'fairness' ? 'bg-green-500' :
                        criteria.key === 'workloadBalance' ? 'bg-purple-500' :
                        criteria.key === 'skillMatching' ? 'bg-yellow-500' :
                        'bg-indigo-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-12 text-xs text-right font-mono">
                    {Math.round(percentage)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {totalWeight !== 100 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-yellow-800">
              <Target className="h-4 w-4" />
              <span className="text-sm font-medium">
                {totalWeight > 100 ? 'Weights exceed 100%' : 'Weights below 100%'}
              </span>
            </div>
            <p className="text-xs text-yellow-700 mt-1">
              Adjust the sliders so the total equals 100% for optimal allocation.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}