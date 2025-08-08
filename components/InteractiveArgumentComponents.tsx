'use client'

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, AlertCircle, User, Coins } from 'lucide-react';

interface InteractiveComponentData {
  type: 'input' | 'textarea' | 'combobox';
  inputType?: string;
  label: string;
  placeholder: string;
  options?: Array<{
    value: string;
    label: string;
    category: string;
    symbol?: string;
  }>;
  allowCustom?: boolean;
  validation?: string;
  rows?: number;
}

interface InteractiveArguments {
  type: 'argumentRequest';
  message: string;
  components: InteractiveComponentData[];
  missingArgs: string[];
}

interface InteractiveArgumentComponentsProps {
  interactiveData: InteractiveArguments;
  onSubmit: (responses: Record<string, string>) => void;
  onCancel: () => void;
}

export function InteractiveArgumentComponents({
  interactiveData,
  onSubmit,
  onCancel
}: InteractiveArgumentComponentsProps) {
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleValueChange = (argName: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [argName]: value
    }));

    // Clear error when user starts typing
    if (errors[argName]) {
      setErrors(prev => ({
        ...prev,
        [argName]: ''
      }));
    }
  };

  const validateInput = (argName: string, value: string, validation?: string): string => {
    if (!validation) return '';

    switch (validation) {
      case 'required':
        return !value.trim() ? 'This field is required' : '';
      
      case 'positive_number':
        const num = parseFloat(value);
        if (isNaN(num) || num <= 0) {
          return 'Please enter a positive number';
        }
        return '';
      
      case 'address':
        if (!value.trim()) return 'Address is required';
        if (!/^0\.0\.\d+$/.test(value) && !/^[a-zA-Z\s]+$/.test(value)) {
          return 'Enter a valid address (0.0.xxxxx) or contact name';
        }
        return '';
      
      case 'token_id':
        if (!value.trim()) return 'Token is required';
        if (!/^0\.0\.\d+$/.test(value) && !/^[A-Z]+$/.test(value)) {
          return 'Enter a valid token ID (0.0.xxxxx) or symbol (e.g., HBAR, USDC)';
        }
        return '';
      
      case 'topic_id':
        if (!value.trim()) return 'Topic ID is required';
        if (!/^0\.0\.\d+$/.test(value)) {
          return 'Enter a valid topic ID (0.0.xxxxx)';
        }
        return '';
      
      default:
        return '';
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    // Validate all inputs
    const newErrors: Record<string, string> = {};
    
    interactiveData.components.forEach((component, index) => {
      const argName = interactiveData.missingArgs[index];
      const value = responses[argName] || '';
      const error = validateInput(argName, value, component.validation);
      
      if (error) {
        newErrors[argName] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      await onSubmit(responses);
    } catch (error) {
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderComponent = (component: InteractiveComponentData, argName: string) => {
    const value = responses[argName] || '';
    const error = errors[argName];

    switch (component.type) {
      case 'input':
        return (
          <div className="space-y-2">
            <Label htmlFor={argName}>{component.label}</Label>
            <Input
              id={argName}
              type={component.inputType || 'text'}
              placeholder={component.placeholder}
              value={value}
              onChange={(e) => handleValueChange(argName, e.target.value)}
              className={error ? 'border-red-500' : ''}
            />
            {error && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error}
              </p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div className="space-y-2">
            <Label htmlFor={argName}>{component.label}</Label>
            <Textarea
              id={argName}
              placeholder={component.placeholder}
              value={value}
              onChange={(e) => handleValueChange(argName, e.target.value)}
              rows={component.rows || 3}
              className={error ? 'border-red-500' : ''}
            />
            {error && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error}
              </p>
            )}
          </div>
        );

      case 'combobox':
        return (
          <div className="space-y-2">
            <Label htmlFor={argName}>{component.label}</Label>
            {component.options && component.options.length > 0 ? (
              <ComboboxWithOptions
                options={component.options}
                value={value}
                onChange={(newValue) => handleValueChange(argName, newValue)}
                placeholder={component.placeholder}
                allowCustom={component.allowCustom}
                error={error}
              />
            ) : (
              <Input
                id={argName}
                type="text"
                placeholder={component.placeholder}
                value={value}
                onChange={(e) => handleValueChange(argName, e.target.value)}
                className={error ? 'border-red-500' : ''}
              />
            )}
            {error && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const allFieldsFilled = interactiveData.missingArgs.every(argName => 
    responses[argName] && responses[argName].trim() !== ''
  );

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-blue-500" />
          Additional Information Required
        </CardTitle>
        <CardDescription>{interactiveData.message}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {interactiveData.components.map((component, index) => {
          const argName = interactiveData.missingArgs[index];
          return (
            <div key={argName}>
              {renderComponent(component, argName)}
            </div>
          );
        })}

        <Separator />

        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleSubmit}
            disabled={!allFieldsFilled || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Continue
              </>
            )}
          </Button>
          
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface ComboboxWithOptionsProps {
  options: Array<{
    value: string;
    label: string;
    category: string;
    symbol?: string;
  }>;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  allowCustom?: boolean;
  error?: string;
}

function ComboboxWithOptions({
  options,
  value,
  onChange,
  placeholder,
  allowCustom = false,
  error
}: ComboboxWithOptionsProps) {
  const [customInput, setCustomInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Group options by category
  const groupedOptions = options.reduce((acc, option) => {
    if (!acc[option.category]) {
      acc[option.category] = [];
    }
    acc[option.category].push(option);
    return acc;
  }, {} as Record<string, typeof options>);

  const handleSelectChange = (newValue: string) => {
    if (newValue === 'custom' && allowCustom) {
      setShowCustomInput(true);
      onChange('');
    } else {
      setShowCustomInput(false);
      onChange(newValue);
    }
  };

  const handleCustomInputChange = (newValue: string) => {
    setCustomInput(newValue);
    onChange(newValue);
  };

  if (showCustomInput) {
    return (
      <div className="space-y-2">
        <Input
          type="text"
          placeholder="Enter custom value..."
          value={customInput}
          onChange={(e) => handleCustomInputChange(e.target.value)}
          className={error ? 'border-red-500' : ''}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setShowCustomInput(false);
            setCustomInput('');
            onChange('');
          }}
        >
          Back to list
        </Button>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={handleSelectChange}>
      <SelectTrigger className={error ? 'border-red-500' : ''}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(groupedOptions).map(([category, categoryOptions]) => (
          <div key={category}>
            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </div>
            {categoryOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  {option.symbol && (
                    <Badge variant="secondary" className="text-xs">
                      {option.symbol}
                    </Badge>
                  )}
                  {category === 'personal' || category === 'work' ? (
                    <User className="h-3 w-3" />
                  ) : (
                    <Coins className="h-3 w-3" />
                  )}
                  <span>{option.label}</span>
                </div>
              </SelectItem>
            ))}
          </div>
        ))}
        {allowCustom && (
          <div>
            <Separator className="my-1" />
            <SelectItem value="custom">
              <span className="text-blue-600">Enter custom value...</span>
            </SelectItem>
          </div>
        )}
      </SelectContent>
    </Select>
  );
}

export default InteractiveArgumentComponents;
