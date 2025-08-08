"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Target, 
  TrendingUp, 
  Shield, 
  Zap, 
  Brain,
  X,
  Loader2,
  AlertCircle,
  Star,
  CheckCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthWrapper';

interface AgentCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAgent: (agentType: string, agentName: string) => void;
}

interface PreconfiguredAgent {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  features: string[];
  strategy: string;
  configuration: {
    defaultBudget: number;
    frequency: string;
    riskTolerance: string;
    preferredTokens: string[];
  };
  expertise: string;
  specialty: string;
}

interface AgentConfig {
  name: string;
  description: string;
  userId: string;
  primaryStrategy: string;
  configuration: {
    defaultBudget: number;
    frequency: string;
    riskTolerance: string;
    preferredTokens: string[];
  };
}

interface CreateAgentResponse {
  success: boolean;
  data?: {
    id?: string;
    _id?: string;
    name: string;
    description: string;
    userId: string;
    primaryStrategy: string;
    configuration: any;
    createdAt: string;
  };
  error?: string;
}

// Icon mapping
const iconMap: { [key: string]: any } = {
  Bot,
  Target,
  TrendingUp,
  Shield,
  Zap,
  Brain
};

export default function AgentCreationModal({ isOpen, onClose, onSelectAgent }: AgentCreationModalProps) {
  const [preconfiguredAgents, setPreconfiguredAgents] = useState<PreconfiguredAgent[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<PreconfiguredAgent | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  // Function to get user ID from auth context
  const getUserId = () => {
    return user?.id || null;
  };

  // Load preconfigured agents
  useEffect(() => {
    const loadPreconfiguredAgents = async () => {
      try {
        const response = await fetch('/config/preconfigured-agents.json');
        const agents = await response.json();
        setPreconfiguredAgents(agents);
      } catch (error) {
        console.error('Error loading preconfigured agents:', error);
        setError('Failed to load agent configurations');
      }
    };

    if (isOpen) {
      loadPreconfiguredAgents();
    }
  }, [isOpen]);

  // Generate a unique identifier for agent names
  const generateUniqueId = () => {
    // Use crypto.randomUUID if available, otherwise fallback to timestamp + random
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID().substring(0, 8);
    }
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  };

  const createAgent = async (config: AgentConfig): Promise<CreateAgentResponse> => {
    try {
      console.log('Creating agent with config:', JSON.stringify(config, null, 2));
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          console.log('Error response data:', errorData);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          // If we can't parse the error response, try to get it as text
          try {
            const errorText = await response.text();
            console.log('Error response text:', errorText);
            if (errorText) {
              errorMessage = errorText;
            }
          } catch (e2) {
            console.log('Could not parse error response');
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Success response data:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error creating agent:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create agent' 
      };
    }
  };

  const handleCreateAgent = async (agent: PreconfiguredAgent) => {
    setIsCreating(true);
    setError(null);
    setSelectedAgent(agent);

    try {
      // Generate unique ID and append to agent name
      const uniqueId = generateUniqueId();
      const uniqueName = `${agent.name} #${uniqueId}`;

      // Ensure all required fields are present and properly formatted
      // Get userId from auth context
      const userId = getUserId(); // This should come from your auth system
      
      if (!userId) {
        setError('User not authenticated. Please log in first.');
        setIsCreating(false);
        return;
      }

      const agentConfig: AgentConfig = {
        name: uniqueName,
        description: agent.description,
        userId: userId,
        primaryStrategy: agent.strategy,
        configuration: {
          defaultBudget: agent.configuration.defaultBudget,
          frequency: agent.configuration.frequency,
          riskTolerance: agent.configuration.riskTolerance,
          preferredTokens: agent.configuration.preferredTokens || []
        }
      };

      console.log('Attempting to create agent:', agentConfig);

      const result = await createAgent(agentConfig);

      if (result.success && result.data) {
        console.log('Agent created successfully:', result.data);
        onSelectAgent(agent.id, uniqueName);
        onClose();
        router.push('/dashboard');
      } else {
        console.error('Agent creation failed:', result.error);
        setError(result.error || 'Failed to create agent');
      }
    } catch (error) {
      console.error('Error in handleCreateAgent:', error);
      setError('An unexpected error occurred');
    } finally {
      setIsCreating(false);
      setSelectedAgent(null);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setError(null);
      setSelectedAgent(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl sm:text-2xl font-bold">Choose Your AI Agent</DialogTitle>
            {!isCreating && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Select a preconfigured AI agent expertly designed for specific crypto strategies
          </p>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {preconfiguredAgents.map((agent) => {
            const IconComponent = iconMap[agent.icon] || Bot;
            const isSelected = selectedAgent?.id === agent.id;
            const isLoading = isCreating && isSelected;

            return (
              <Card 
                key={agent.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${
                  isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''
                } ${isCreating && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !isCreating && handleCreateAgent(agent)}
              >
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-xl bg-gradient-to-r ${agent.color} flex items-center justify-center`}>
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                    {isLoading && (
                      <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                    )}
                    {isSelected && !isLoading && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold">{agent.name}</CardTitle>
                    <CardDescription className="text-sm mt-1">
                      {agent.description}
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Expertise Badge */}
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <Badge variant="secondary" className="text-xs">
                      {agent.expertise}
                    </Badge>
                  </div>

                  {/* Specialty */}
                  <p className="text-xs text-muted-foreground italic">
                    {agent.specialty}
                  </p>

                  {/* Features */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Key Features:</h4>
                    <div className="grid grid-cols-1 gap-1">
                      {agent.features.slice(0, 3).map((feature, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                          <span className="text-xs text-muted-foreground">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Configuration Preview */}
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <h4 className="text-sm font-medium">Configuration:</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Budget:</span>
                        <div className="font-medium">${agent.configuration.defaultBudget}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Frequency:</span>
                        <div className="font-medium capitalize">{agent.configuration.frequency}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Risk:</span>
                        <div className="font-medium capitalize">{agent.configuration.riskTolerance}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tokens:</span>
                        <div className="font-medium">{agent.configuration.preferredTokens.length}</div>
                      </div>
                    </div>
                  </div>

                  {/* Create Button */}
                  <Button 
                    className={`w-full ${isLoading ? 'opacity-50' : ''}`}
                    disabled={isCreating}
                    onClick={(e) => {
                      e.stopPropagation();
                      !isCreating && handleCreateAgent(agent);
                    }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Agent...
                      </>
                    ) : (
                      `Create ${agent.name}`
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {preconfiguredAgents.length === 0 && !error && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading agent configurations...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}