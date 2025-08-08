'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthWrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Bot, 
  User, 
  RefreshCw,
  TrendingUp,
  DollarSign,
  Target,
  AlertTriangle,
  CheckCircle,
  Info,
  Activity,
  MessageSquare,
  BarChart3,
  Coins,
  ArrowUpDown,
  Calendar,
  Shield,
  Lightbulb,
  Clock,
  Zap,
  Settings,
  AlertCircle,
  TrendingDown,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Bookmark,
  BookmarkCheck,
  Calculator,
  PieChart,
  Percent
} from 'lucide-react';

import InteractiveArgumentComponents from './InteractiveArgumentComponents';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  classification?: {
    category: string;
    reason: string;
  };
  responseData?: any; // Complete response data from backend
  interactiveData?: {
    type: 'argumentRequest';
    message: string;
    components: any[];
    missingArgs: string[];
  };
  originalIntent?: any; // Store original intent for interactive responses
}

interface AgentRouteResponse {
  success: boolean;
  data: {
    // Layer 1 results
    classification: {
      type: string;
      confidence: number;
      reasoning: string;
      keywords: string[];
      actionSubtype?: string;
    };
    
    // Layer 2 results  
    processing: {
      type: string;
      subtype?: string;
      status: string;
      result: {
        actionType?: string;
        steps?: string[];
        warnings?: string[];
        riskLevel?: string;
        estimatedTime?: string;
        executionStatus?: string;
        execution?: {
          success: boolean;
          transactionDetails?: any;
          executionSummary?: any;
          parsedRequest?: any;
          error?: string;
          swapDetails?: {
            success: boolean;
            error?: string;
            timestamp?: string;
          };
        };
        // Swap-specific fields
        fromToken?: string;
        toToken?: string;
        amount?: string | number;
        estimatedReceive?: string;
        priceImpact?: string;
        slippageTolerance?: string;
        bestRoute?: string;
        marketConditions?: string;
        // Strategy fields
        recommendations?: string[];
        strategyType?: string;
        riskAssessment?: string;
        timeframe?: string;
        // Information fields
        answer?: string;
        category?: string;
        relatedData?: any[];
        // Feedback fields
        sentiment?: string;
        keyInsights?: string[];
        suggestions?: string[];
        analysis?: string;
        // General response
        response?: string;
      };
    };
    
    // Metadata
    metadata: {
      originalMessage: string;
      userId?: string;
      agentId?: string;
      processingTime: string;
      timestamp: string;
      routerVersion: string;
    };
  };
}

export default function MasterAgentChat() {
  const { user } = useAuth();
  
  // Helper function to safely render any value as string
  const safeRender = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (typeof value === 'object') {
      try {
        // Handle empty objects specifically
        if (Object.keys(value).length === 0) {
          return '[Empty Object]';
        }
        return JSON.stringify(value);
      } catch {
        return '[Object]';
      }
    }
    return String(value);
  };

  // Helper to check if a value is safe to render directly
  const isSafeToRender = (value: any): boolean => {
    return (
      value === null ||
      value === undefined ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    );
  };
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: `Welcome! I'm your Master Agent - your comprehensive AI assistant for all cryptocurrency and trading needs. I can help you with:

🔍 **Information** - Market data, price analysis, crypto explanations
⚡ **Actions** - Trading operations, transfers, swaps
📊 **Strategy** - Investment plans, portfolio recommendations  
💬 **Feedback** - Performance analysis, trade reviews

Ask me anything about crypto, and I'll provide detailed insights and actionable guidance!`,
      sender: 'agent',
      timestamp: new Date()
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [savedAnalyses, setSavedAnalyses] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize session ID on component mount
  useEffect(() => {
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    setSessionId(newSessionId);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const saveAnalysis = (messageId: string) => {
    setSavedAnalyses(prev => new Set(prev).add(messageId));
    // In a real app, you would also save to localStorage or backend
    const analysisData = messages.find(m => m.id === messageId);
    if (analysisData?.responseData) {
      localStorage.setItem(`analysis_${messageId}`, JSON.stringify(analysisData.responseData));
    }
  };

  const unsaveAnalysis = (messageId: string) => {
    setSavedAnalyses(prev => {
      const newSet = new Set(prev);
      newSet.delete(messageId);
      return newSet;
    });
    localStorage.removeItem(`analysis_${messageId}`);
  };

  const callAgentRoute = async (message: string): Promise<AgentRouteResponse> => {
    try {
      console.log('🌐 MasterAgentChat calling agent route with message:', message);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const userId = user?.id || (user as any)?._id || 'user123';
      
      const requestBody = {
        message,
        userId,
        agentId: 'master-agent',
        execute: true // Enable full processing for comprehensive analysis
      };
      
      console.log('🔗 MasterAgentChat API URL:', `${apiUrl}/api/agent/route`);
      console.log('📤 MasterAgentChat Request body:', requestBody);
      
      const response = await fetch(`${apiUrl}/api/agent/route`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 MasterAgentChat Response status:', response.status, response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ MasterAgentChat Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📊 MasterAgentChat Raw response data:', data);
      return data;
    } catch (error) {
      console.error('Error calling agent route API:', error);
      throw error;
    }
  };

  const callEnhancedIntent = async (message: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const userId = user?.id || (user as any)?._id || 'user123';
      
      const response = await fetch(`${apiUrl}/api/enhanced-intent/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message,
          userId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error calling enhanced intent API:', error);
      throw error;
    }
  };

  const processInteractiveResponse = async (originalIntent: any, userResponses: Record<string, string>) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const userId = user?.id || (user as any)?._id || 'user123';
      
      const response = await fetch(`${apiUrl}/api/enhanced-intent/interactive-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          originalIntent,
          userResponses,
          userId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error processing interactive response:', error);
      throw error;
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: newMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = newMessage;
    setNewMessage('');
    setIsTyping(true);

    try {
      // Check if this is a swap message - if so, route directly to agent route
      const isSwapMessage = /\b(swap|exchange|trade|convert)\b.*\b(hbar|usdc|usdt|sauce|dovu|grelf|whbar|for|to)\b/i.test(currentMessage);
      
      if (isSwapMessage) {
        console.log('🔄 Detected swap message, routing to agent route endpoint');
        // Route swap messages directly to agent route for proper execution
        const agentResponse = await callAgentRoute(currentMessage);
        
        console.log('🚀 FULL Agent Response received in MasterAgentChat:', JSON.stringify(agentResponse, null, 2));
        
        if (agentResponse.success && agentResponse.data) {
          console.log('✅ Response has success=true and data exists');
          const { classification, processing } = agentResponse.data;
          
          console.log('📊 Classification:', classification);
          console.log('⚙️ Processing:', processing);
          console.log('🎯 Processing type:', processing?.type);
          console.log('🎯 Processing result:', processing?.result);
          console.log('🎯 Action type:', processing?.result?.actionType);
          
          // Create classification object compatible with our UI
          const demandClassification = {
            category: classification?.type === 'actions' ? 'action' : classification?.type || 'information',
            reason: classification?.reasoning || 'Processing your swap request'
          };
          
          // Generate response content based on processing results
          let responseContent = '';
          if (processing?.result) {
            console.log('✅ Processing result exists, entering response generation...');
            if (processing.type === 'actions' && processing.result.actionType === 'swap') {
              console.log('🔄 Processing swap action in MasterAgentChat...');
              console.log('🔄 Actions object:', processing.result);
              
              const actions = processing.result;
              const execution = actions.execution;
              const swapDetails = execution?.swapDetails;
              
              console.log('🔄 Execution:', execution);
              console.log('🔄 SwapDetails:', swapDetails);
              
              // Check if swap actually succeeded
              const swapFailed = swapDetails && !swapDetails.success;
              const swapError = swapDetails?.error;
              const executionFailed = execution?.executionSummary?.status === 'failed';
              
              console.log('🔄 SwapDetails success:', swapDetails?.success);
              console.log('🔄 SwapFailed:', swapFailed);
              console.log('🔄 ExecutionFailed:', executionFailed);
              console.log('🔄 SwapError:', swapError);
              
              // Fix error detection logic
              const isError = swapFailed || executionFailed || (swapDetails && swapDetails.success === false);
              const isSuccess = swapDetails?.success === true && execution?.executionSummary?.status !== 'failed';
              
              console.log('🎯 Final determination - isError:', isError, 'isSuccess:', isSuccess);
              
              // Extract transaction ID
              let transactionId = '';
              if (swapError && swapError.includes('transaction')) {
                const txMatch = swapError.match(/transaction ([0-9.@]+)/);
                if (txMatch) transactionId = txMatch[1];
              }
              
              responseContent = `
<div style="max-width: 600px; margin: 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  
  <!-- Header Card -->
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; padding: 24px; color: white; margin-bottom: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
      <div style="background: rgba(255,255,255,0.2); border-radius: 12px; padding: 8px;">
        🔄
      </div>
      <h2 style="margin: 0; font-size: 24px; font-weight: 600;">Swap Transaction</h2>
    </div>
    
    <div style="background: rgba(255,255,255,0.15); border-radius: 12px; padding: 16px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-size: 14px; opacity: 0.9;">From</span>
        <span style="font-size: 14px; opacity: 0.9;">To</span>
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="text-align: left;">
          <div style="font-size: 20px; font-weight: 700;">${actions.amount} ${actions.fromToken}</div>
        </div>
        <div style="background: rgba(255,255,255,0.2); border-radius: 50%; padding: 8px; margin: 0 16px;">
          →
        </div>
        <div style="text-align: right;">
          <div style="font-size: 20px; font-weight: 700;">~${actions.estimatedReceive}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Status Card -->
  ${isError ? `
  <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); border-radius: 16px; padding: 24px; color: white; margin-bottom: 16px; box-shadow: 0 8px 32px rgba(255,107,107,0.3);">
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
      <div style="background: rgba(255,255,255,0.2); border-radius: 12px; padding: 8px; font-size: 20px;">
        ❌
      </div>
      <h3 style="margin: 0; font-size: 20px; font-weight: 600;">Transaction Failed</h3>
    </div>
    
    <div style="background: rgba(255,255,255,0.15); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
      <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">Error Details</h4>
      <p style="margin: 0; font-size: 14px; line-height: 1.5;">
                                ${(() => {
                          let errorMsg = swapError || 'Swap execution failed';
                          if (swapError && swapError.includes('INSUFFICIENT_PAYER_BALANCE')) {
                            errorMsg = 'Insufficient HBAR balance in agent wallet for transaction fees';
                          } else if (swapError && swapError.includes('INSUFFICIENT_TOKEN_BALANCE')) {
                            errorMsg = 'Insufficient token balance for swap amount';
                          } else if (swapError && swapError.includes('failed precheck')) {
                            errorMsg = 'Transaction failed validation - check balance and network status';
                          }
                          console.log('🔴 Displaying error message:', errorMsg);
                          return errorMsg;
                        })()}
      </p>
    </div>
    
    ${transactionId ? `
    <div style="background: rgba(255,255,255,0.15); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
      <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">Transaction ID</h4>
      <code style="background: rgba(255,255,255,0.2); padding: 8px 12px; border-radius: 8px; font-size: 13px; word-break: break-all;">${transactionId}</code>
    </div>
    ` : ''}
    
    <div style="background: rgba(255,255,255,0.15); border-radius: 12px; padding: 16px;">
      <h4 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Troubleshooting</h4>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
        <li>Check agent wallet balance</li>
        <li>Ensure sufficient HBAR for fees (≥0.1 HBAR)</li>
        <li>Verify token associations</li>
        <li>Check network connectivity</li>
      </ul>
    </div>
  </div>
  ` : isSuccess ? `
  <div style="background: linear-gradient(135deg, #51cf66 0%, #40c057 100%); border-radius: 16px; padding: 24px; color: white; margin-bottom: 16px; box-shadow: 0 8px 32px rgba(81,207,102,0.3);">
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
      <div style="background: rgba(255,255,255,0.2); border-radius: 12px; padding: 8px; font-size: 20px;">
        ✅
      </div>
      <h3 style="margin: 0; font-size: 20px; font-weight: 600;">Transaction Successful</h3>
    </div>
    
    <div style="background: rgba(255,255,255,0.15); border-radius: 12px; padding: 16px;">
      <p style="margin: 0; font-size: 14px; line-height: 1.5;">
        Your swap has been processed successfully on the Hedera network!
      </p>
    </div>
  </div>
  ` : `
  <div style="background: linear-gradient(135deg, #ffd43b 0%, #fab005 100%); border-radius: 16px; padding: 24px; color: #495057; margin-bottom: 16px; box-shadow: 0 8px 32px rgba(255,212,59,0.3);">
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
      <div style="background: rgba(255,255,255,0.3); border-radius: 12px; padding: 8px; font-size: 20px;">
        🔄
      </div>
      <h3 style="margin: 0; font-size: 20px; font-weight: 600;">Processing Transaction</h3>
    </div>
    
    <div style="background: rgba(255,255,255,0.2); border-radius: 12px; padding: 16px;">
      <p style="margin: 0; font-size: 14px; line-height: 1.5;">
        Your swap request is being processed...
      </p>
    </div>
  </div>
  `}

  <!-- Transaction Details Card -->
  <div style="background: white; border: 1px solid #e9ecef; border-radius: 16px; padding: 24px; margin-bottom: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.05);">
    <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #495057;">Transaction Details</h3>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
      <div style="background: #f8f9fa; border-radius: 12px; padding: 16px;">
        <div style="font-size: 12px; color: #6c757d; margin-bottom: 4px;">Price Impact</div>
        <div style="font-size: 16px; font-weight: 600; color: #495057;">${actions.priceImpact || 'N/A'}</div>
      </div>
      <div style="background: #f8f9fa; border-radius: 12px; padding: 16px;">
        <div style="font-size: 12px; color: #6c757d; margin-bottom: 4px;">Slippage</div>
        <div style="font-size: 16px; font-weight: 600; color: #495057;">${actions.slippageTolerance || 'N/A'}</div>
      </div>
      <div style="background: #f8f9fa; border-radius: 12px; padding: 16px;">
        <div style="font-size: 12px; color: #6c757d; margin-bottom: 4px;">Route</div>
        <div style="font-size: 16px; font-weight: 600; color: #495057;">${actions.bestRoute || 'SaucerSwap V2'}</div>
      </div>
      <div style="background: #f8f9fa; border-radius: 12px; padding: 16px;">
        <div style="font-size: 12px; color: #6c757d; margin-bottom: 4px;">Est. Time</div>
        <div style="font-size: 16px; font-weight: 600; color: #495057;">${actions.estimatedTime?.replace('The swap is expected to be executed within ', '').replace(' to complete, depending on the Hedera network congestion.', '').replace(' to complete.', '') || '1-2 min'}</div>
      </div>
    </div>
    
    <div style="background: #f8f9fa; border-radius: 12px; padding: 16px;">
      <div style="font-size: 12px; color: #6c757d; margin-bottom: 8px;">Market Conditions</div>
      <div style="font-size: 14px; color: #495057; line-height: 1.5;">${actions.marketConditions || 'Current market conditions are stable'}</div>
    </div>
  </div>

  ${actions.warnings && actions.warnings.length > 0 ? `
  <!-- Warnings Card -->
  <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 16px; padding: 24px; margin-bottom: 16px;">
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
      <div style="background: #fdcb6e; border-radius: 8px; padding: 6px; font-size: 16px;">
        ⚠️
      </div>
      <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #856404;">Important Warnings</h3>
    </div>
    
    <ul style="margin: 0; padding-left: 20px; color: #856404;">
      ${actions.warnings.map((warning: string) => `<li style="margin-bottom: 8px; line-height: 1.5;">${warning}</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  ${actions.recommendations && actions.recommendations.length > 0 ? `
  <!-- Recommendations Card -->
  <div style="background: #d1ecf1; border: 1px solid #b8daff; border-radius: 16px; padding: 24px; margin-bottom: 16px;">
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
      <div style="background: #74c0fc; border-radius: 8px; padding: 6px; font-size: 16px;">
        💡
      </div>
      <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #0c5460;">Recommendations</h3>
    </div>
    
    <ul style="margin: 0; padding-left: 20px; color: #0c5460;">
      ${actions.recommendations.map((rec: string) => `<li style="margin-bottom: 8px; line-height: 1.5;">${rec}</li>`).join('')}
    </ul>
  </div>
  ` : ''}



</div>
`;
            } else {
              responseContent = processing.result.response || 'Processing your request...';
            }
          } else {
            responseContent = 'Processing your swap request...';
          }
          
          const agentMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: responseContent,
            sender: 'agent',
            timestamp: new Date(),
            classification: demandClassification,
            responseData: agentResponse.data
          };
          
          console.log('📝 Final agent message created:', {
            id: agentMessage.id,
            contentLength: responseContent.length,
            contentPreview: responseContent.substring(0, 200) + '...',
            classification: demandClassification,
            hasResponseData: !!agentResponse.data
          });
          
          setMessages(prev => [...prev, agentMessage]);
          console.log('✅ Message added to state, stopping typing indicator');
          setIsTyping(false);
          return;
        } else {
          console.log('❌ Agent response failed or missing data:', {
            success: agentResponse.success,
            hasData: !!agentResponse.data,
            response: agentResponse
          });
        }
      }
      
      // For non-swap messages, try enhanced intent service first
      const enhancedResponse = await callEnhancedIntent(currentMessage);
      
      if (enhancedResponse.success && enhancedResponse.data) {
        const { type, data } = enhancedResponse;
        
        if (type === 'argumentRequest') {
          // Show interactive components for missing arguments
          const agentMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: data.interactive.message,
            sender: 'agent',
            timestamp: new Date(),
            classification: {
              category: 'action',
              reason: 'Collecting required information for action'
            },
            interactiveData: data.interactive,
            originalIntent: data.intent
          };
          
          setMessages(prev => [...prev, agentMessage]);
          return;
        }
        
        if (type === 'actionComplete') {
          // Action was executed successfully
          const actionType = data?.intent?.extraction?.actionType || 'transfer';
          const txDetails = data?.actionResult?.transactionDetails;
          
          let content = `✅ **${actionType.toUpperCase()} Completed Successfully**\n\n`;
          
          if (txDetails) {
            if (actionType === 'transfer') {
              const amount = txDetails.amount || data?.intent?.extraction?.args?.amount;
              const token = txDetails.tokenId || 'HBAR';
              const recipient = data?.intent?.validation?.resolved?.recipient_resolved?.name || 
                              data?.intent?.validation?.resolved?.recipient || 
                              txDetails.toAccount;
              
              content += `**Transfer Details:**\n`;
              content += `• Amount: ${amount} ${token}\n`;
              content += `• To: ${recipient}\n`;
              content += `• Transaction ID: ${txDetails.transactionId}\n`;
              content += `• Status: ${txDetails.status}\n\n`;
              content += `The transaction has been successfully processed on the Hedera network.`;
            } else {
              content += `Your ${actionType} action has been executed successfully.\n`;
              content += `Transaction ID: ${txDetails.transactionId}`;
            }
          } else {
            content += `Your ${actionType} action has been executed successfully.`;
          }
          
          const agentMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: content,
            sender: 'agent',
            timestamp: new Date(),
            classification: {
              category: 'action',
              reason: 'Action executed successfully'
            },
            responseData: data
          };
          
          setMessages(prev => [...prev, agentMessage]);
          return;
        }
        
        if (type === 'actionError') {
          // Action failed
          const agentMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: `❌ **Action Failed**\n\n${data.error}`,
            sender: 'agent',
            timestamp: new Date(),
            classification: {
              category: 'action',
              reason: 'Action execution failed'
            },
            responseData: data
          };
          
          setMessages(prev => [...prev, agentMessage]);
          return;
        }
      }
      
      // Fallback to original agent route if enhanced intent fails
      const agentResponse = await callAgentRoute(currentMessage);
      
      if (agentResponse.success && agentResponse.data) {
        const { classification, processing } = agentResponse.data;
        
        // Create classification object compatible with our UI
        const demandClassification = {
          category: classification?.type === 'actions' ? 'action' : classification?.type || 'information',
          reason: classification?.reasoning || 'Processing your request'
        };
        
        // Generate response content based on processing results
        let responseContent = '';
        if (processing?.result) {
          if (processing.type === 'actions') {
            const actionType = processing.result.actionType;
            const hasWarnings = processing.result.warnings && processing.result.warnings.length > 0;
            const hasErrors = processing.result.execution && !processing.result.execution.success;
            
            if (actionType === 'swap') {
              if (hasWarnings) {
                responseContent = `⚠️ **Swap Request Analyzed**\n\nI've analyzed your swap request, but there are some issues that need attention.`;
              } else if (hasErrors) {
                responseContent = `❌ **Swap Failed**\n\nI attempted to execute your swap but encountered an error.`;
              } else {
                responseContent = `🔄 **Swap Executed**\n\nYour swap has been processed.`;
              }
            } else {
              responseContent = `🎯 **${(actionType || 'Action').toUpperCase()} Request Processed**\n\nI've analyzed your request and prepared the following action plan.`;
            }
          } else if (processing.type === 'strategy') {
            responseContent = `📊 **Strategy Analysis**\n\nI've analyzed your strategy requirements and prepared recommendations.`;
          } else if (processing.type === 'information') {
            responseContent = `ℹ️ **Information Response**\n\nHere's the information you requested.`;
          } else if (processing.type === 'feedbacks') {
            responseContent = `💬 **Feedback Analysis**\n\nI've analyzed your feedback and prepared insights.`;
          } else {
            responseContent = processing.result.response || 'Processing your request...';
          }
        } else {
          responseContent = 'Processing your request...';
        }
        
        const agentMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: responseContent,
          sender: 'agent',
          timestamp: new Date(),
          classification: demandClassification,
          responseData: agentResponse.data
        };
        
        setMessages(prev => [...prev, agentMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        sender: 'agent',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleInteractiveSubmit = async (responses: Record<string, string>, messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || !message.originalIntent) return;

    setIsTyping(true);
    
    try {
      const result = await processInteractiveResponse(message.originalIntent, responses);
      
      if (result.success && result.data) {
        const { type, data } = result;
        console.log('Interactive response result:', { type, data });
        
        if (type === 'argumentRequest') {
          // Still missing some arguments, update the interactive components
          const updatedMessage: Message = {
            ...message,
            interactiveData: data.interactive,
            originalIntent: data.intent
          };
          
          setMessages(prev => prev.map(m => m.id === messageId ? updatedMessage : m));
        } else if (type === 'actionComplete') {
          // Action completed, replace interactive message with success message
          const actionType = data?.intent?.extraction?.actionType || 'transfer';
          const txDetails = data?.actionResult?.transactionDetails;
          
          let content = `✅ **${actionType.toUpperCase()} Completed Successfully**\n\n`;
          
          if (txDetails) {
            if (actionType === 'transfer') {
              const amount = txDetails.amount || data?.intent?.extraction?.args?.amount;
              const token = txDetails.tokenId || 'HBAR';
              const recipient = data?.intent?.validation?.resolved?.recipient_resolved?.name || 
                              data?.intent?.validation?.resolved?.recipient || 
                              txDetails.toAccount;
              
              content += `**Transfer Details:**\n`;
              content += `• Amount: ${amount} ${token}\n`;
              content += `• To: ${recipient}\n`;
              content += `• Transaction ID: ${txDetails.transactionId}\n`;
              content += `• Status: ${txDetails.status}\n\n`;
              content += `The transaction has been successfully processed on the Hedera network.`;
            } else {
              content += `Your ${actionType} action has been executed successfully.\n`;
              content += `Transaction ID: ${txDetails.transactionId}`;
            }
          } else {
            content += `Your ${actionType} action has been executed successfully.`;
          }
          
          const successMessage: Message = {
            ...message,
            content: content,
            interactiveData: undefined,
            originalIntent: undefined,
            responseData: data
          };
          
          setMessages(prev => prev.map(m => m.id === messageId ? successMessage : m));
        } else if (type === 'actionError') {
          // Action failed, show error
          const errorMessage: Message = {
            ...message,
            content: `❌ **Action Failed**\n\n${data.error}`,
            interactiveData: undefined,
            originalIntent: undefined,
            responseData: data
          };
          
          setMessages(prev => prev.map(m => m.id === messageId ? errorMessage : m));
        }
      }
    } catch (error) {
      console.error('Interactive submission error:', error);
      const errorMessage: Message = {
        ...message,
        content: 'Sorry, I encountered an error while processing your response. Please try again.',
        interactiveData: undefined,
        originalIntent: undefined
      };
      
      setMessages(prev => prev.map(m => m.id === messageId ? errorMessage : m));
    } finally {
      setIsTyping(false);
    }
  };

  const handleInteractiveCancel = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const cancelledMessage: Message = {
      ...message,
      content: 'Action cancelled. Feel free to ask me anything else!',
      interactiveData: undefined,
      originalIntent: undefined
    };
    
    setMessages(prev => prev.map(m => m.id === messageId ? cancelledMessage : m));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const getClassificationIcon = (category: string) => {
    switch (category) {
      case 'information': return <Info className="w-5 h-5 text-blue-600" />;
      case 'action': 
      case 'actions': return <Zap className="w-5 h-5 text-green-600" />;
      case 'strategy': return <Target className="w-5 h-5 text-purple-600" />;
      case 'feedback': return <MessageSquare className="w-5 h-5 text-orange-600" />;
      default: return <Bot className="w-5 h-5 text-gray-600" />;
    }
  };

  const getClassificationColor = (category: string) => {
    switch (category) {
      case 'information': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'action': 
      case 'actions': return 'bg-green-100 text-green-800 border-green-200';
      case 'strategy': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'feedback': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const renderInformationResponse = (data: any) => {
    const { processing, classification, metadata } = data;
    const info = processing?.result || {};
    
    // Only render enhanced cards for token-specific information
    if (info.requestType !== 'token_specific') {
      // Fallback to simple display for general information
      return (
        <div className="mt-4 space-y-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-blue-800">
                <Info className="w-5 h-5" />
                <span>Information Response</span>
                <Badge className="bg-blue-100 text-blue-800">
                  {(classification?.confidence * 100)?.toFixed(0)}% confident
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-blue-700">{classification?.reasoning}</p>
              {info.answer && <p className="text-sm leading-relaxed mt-3">{info.answer}</p>}
            </CardContent>
          </Card>
        </div>
      );
    }
    
    return (
      <div className="grid gap-4 mt-4 max-w-4xl">
        {/* Analysis Header with Save/Bookmark */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-800">📊 Investment Analysis Report</h3>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const messageId = metadata?.timestamp || Date.now().toString();
                if (savedAnalyses.has(messageId)) {
                  unsaveAnalysis(messageId);
                } else {
                  saveAnalysis(messageId);
                }
              }}
              className="flex items-center space-x-1"
            >
              {savedAnalyses.has(metadata?.timestamp || '') ? (
                <BookmarkCheck className="w-4 h-4 text-blue-600" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
              <span>{savedAnalyses.has(metadata?.timestamp || '') ? 'Saved' : 'Save'}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const reportText = `Investment Analysis Report for ${classification.keywords.join(', ')}
Generated: ${new Date(metadata?.timestamp || '').toLocaleString()}

Market Summary: ${info.analysis?.marketOverview?.summary}

Recommendation: ${info.recommendations?.[0]?.action} with ${info.recommendations?.[0]?.confidence}% confidence
Current Price: $${info.recommendations?.[0]?.currentPrice}
Target Price: $${info.recommendations?.[0]?.targetPrice}
Potential Return: ${info.recommendations?.[0] ? ((info.recommendations[0].targetPrice - info.recommendations[0].currentPrice) / info.recommendations[0].currentPrice * 100).toFixed(2) : '0'}%

Risk Score: ${info.recommendations?.[0]?.riskScore}/100
Timeline: ${info.recommendations?.[0]?.timeframe}

Technical Analysis:
- Trend: ${info.analysis?.technicalSignals?.trend}
- Support: $${info.analysis?.technicalSignals?.support}
- Resistance: $${info.analysis?.technicalSignals?.resistance}
- RSI: ${info.analysis?.technicalSignals?.rsi}

Investment Rationale: ${info.recommendations?.[0]?.reasoning}`;
                navigator.clipboard.writeText(reportText);
              }}
              className="flex items-center space-x-1"
            >
              <Copy className="w-4 h-4" />
              <span>Export</span>
            </Button>
          </div>
        </div>

        {/* 1. Market Overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span>Market Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h3 className="font-bold text-lg text-gray-900">Analysis for {classification.keywords.join(', ')}</h3>
                <p className="text-gray-600 mt-1">{info.analysis?.marketOverview?.summary}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">Price</p>
                  <p className="font-medium text-sm">${info.analysis?.keyMetrics?.avgPrice}</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">24h Change</p>
                  <p className={`font-medium text-sm ${(info.analysis?.keyMetrics?.avgChange24h || 2.47) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(info.analysis?.keyMetrics?.avgChange24h || 2.47) >= 0 ? '+' : ''}{(info.analysis?.keyMetrics?.avgChange24h || 2.47)}%
                  </p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">Sentiment</p>
                  <p className="font-medium text-sm capitalize">{info.analysis?.marketOverview?.sentiment}</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">Volatility</p>
                  <p className="font-medium text-sm">{info.analysis?.keyMetrics?.volatilityIndex}/100</p>
                </div>
              </div>
              
              {/* Enhanced Market Metrics */}
              {info.analysis?.marketOverview && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <BarChart3 className="w-4 h-4 text-blue-600 mr-1" />
                      <p className="text-xs text-blue-600 font-medium">Market Cap</p>
                    </div>
                    <p className="font-bold text-sm text-blue-800">
                      ${((info.analysis.marketOverview.totalMarketCap || 10851000000) / 1000000).toFixed(2)}M
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <Activity className="w-4 h-4 text-green-600 mr-1" />
                      <p className="text-xs text-green-600 font-medium">24h Volume</p>
                    </div>
                    <p className="font-bold text-sm text-green-800">
                      ${((info.analysis.marketOverview.volume24h || 132500000) / 1000000).toFixed(2)}M
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <PieChart className="w-4 h-4 text-purple-600 mr-1" />
                      <p className="text-xs text-purple-600 font-medium">Liquidity Score</p>
                    </div>
                    <p className="font-bold text-sm text-purple-800">{info.analysis?.keyMetrics?.liquidityScore}/100</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 2. Investment Recommendation & Calculator */}
        {info.recommendations && info.recommendations.length > 0 && (
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-green-800">
                <CheckCircle className="w-5 h-5" />
                <span>Investment Recommendation & Calculator</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {info.recommendations.map((rec: any, index: number) => {
                  const potentialReturn = ((rec.targetPrice - rec.currentPrice) / rec.currentPrice * 100);
                  const investmentAmounts = [100, 500, 1000, 5000];
                  
                  return (
                    <div key={index} className="p-4 bg-white rounded-lg border border-green-200 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xl">{rec.token}</span>
                          <Badge variant="outline" className={rec.action === 'BUY' ? 'bg-green-100 text-green-800 border-green-300' : rec.action === 'SELL' ? 'bg-red-100 text-red-800 border-red-300' : 'bg-yellow-100 text-yellow-800 border-yellow-300'}>
                            {rec.action}
                          </Badge>
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                            {rec.confidence}% Confidence
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Price Information */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                          <p className="text-xs text-blue-600 font-medium">Current Price</p>
                          <p className="font-bold text-lg text-blue-800">${rec.currentPrice}</p>
                        </div>
                        <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                          <p className="text-xs text-green-600 font-medium">Target Price</p>
                          <p className="font-bold text-lg text-green-800">${rec.targetPrice}</p>
                        </div>
                        <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                          <p className="text-xs text-purple-600 font-medium">Potential Return</p>
                          <p className={`font-bold text-lg ${potentialReturn > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {potentialReturn > 0 ? '+' : ''}{potentialReturn.toFixed(2)}%
                          </p>
                        </div>
                        <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
                          <p className="text-xs text-orange-600 font-medium">Timeline</p>
                          <p className="font-bold text-lg text-orange-800">{rec.timeframe}</p>
                        </div>
                      </div>

                      {/* Investment Calculator */}
                      <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg mb-4">
                        <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                          <Calculator className="w-4 h-4 mr-2" />
                          Investment Calculator
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {investmentAmounts.map(amount => {
                            const potentialValue = amount * (1 + potentialReturn / 100);
                            const profit = potentialValue - amount;
                            return (
                              <div key={amount} className="text-center p-3 bg-white rounded-lg border">
                                <p className="text-xs text-gray-600">Invest ${amount}</p>
                                <p className="font-medium text-sm text-gray-800">${potentialValue.toFixed(2)}</p>
                                <p className={`text-xs ${profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {profit > 0 ? '+' : ''}${profit.toFixed(2)}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Risk Assessment */}
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center space-x-3 flex-1">
                          <span className="text-sm font-medium">Risk Level:</span>
                          <div className="flex-1 max-w-[150px] h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${rec.riskScore < 30 ? 'bg-gradient-to-r from-green-400 to-green-500' : rec.riskScore < 70 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' : 'bg-gradient-to-r from-red-400 to-red-500'}`}
                              style={{ width: `${rec.riskScore}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">
                            {rec.riskScore}/100 
                            <span className={`ml-1 text-xs ${rec.riskScore < 30 ? 'text-green-600' : rec.riskScore < 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                              ({rec.riskScore < 30 ? 'Low' : rec.riskScore < 70 ? 'Medium' : 'High'})
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Reasoning */}
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <h5 className="font-medium text-blue-800 mb-1">Investment Rationale:</h5>
                        <p className="text-sm text-blue-700">{rec.reasoning}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Processing Metadata */}
        <Card className="bg-gray-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-gray-700">
              <Activity className="w-5 h-5" />
              <span>Analysis Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div><strong>Processing Time:</strong> {metadata?.processingTime}</div>
              <div><strong>AI Model:</strong> {info.marketContext?.aiModel}</div>
              <div><strong>Data Source:</strong> {info.marketContext?.dataSource}</div>
              <div><strong>Last Updated:</strong> {new Date(info.marketContext?.lastUpdated || '').toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderActionResponse = (data: any) => {
    // Handle both old format (processing.result) and new format (actionResult)
    const { processing, classification, metadata, intent, actionResult } = data;
    const result = actionResult || processing?.result || {};
    
    // Skip swap actions - they have their own beautiful UI
    if (result.actionType === 'swap' || processing?.result?.actionType === 'swap') {
      console.log('⚡ Skipping old action response for swap - using beautiful UI instead');
      return null;
    }
    
    // Use enhanced intent classification if available, fallback to processing classification
    const classificationData = intent?.classification || classification;
    const metadataData = metadata || { timestamp: intent?.timestamp };
    
    // Extract transaction details from either format
    const transactionDetails = result.transactionDetails || result.execution?.transactionDetails;
    
    return (
      <div className="grid gap-4 mt-4 max-w-4xl">
        {/* Action Header with Save/Export */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-800">⚡ Blockchain Action Executed</h3>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const messageId = metadataData?.timestamp || Date.now().toString();
                if (savedAnalyses.has(messageId)) {
                  unsaveAnalysis(messageId);
                } else {
                  saveAnalysis(messageId);
                }
              }}
              className="flex items-center space-x-1"
            >
              {savedAnalyses.has(metadataData?.timestamp || '') ? (
                <BookmarkCheck className="w-4 h-4 text-blue-600" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
              <span>Save</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Handle both old and new transaction detail structures
                const txDetails = result.transactionDetails || result.execution?.transactionDetails;
                const reportText = `Blockchain Action Report
Generated: ${new Date(metadataData?.timestamp || '').toLocaleString()}

Action: ${classificationData?.actionSubtype || result.actionType}
Status: ${result.success ? 'SUCCESS' : (result.executionStatus || 'PENDING')}

${txDetails ? `
Transaction Details:
- Transaction ID: ${txDetails.transactionId}
- From: ${txDetails.fromAccount}
- To: ${txDetails.toAccount}
- Amount: ${txDetails.amount} ${txDetails.tokenId || 'HBAR'}
- Status: ${txDetails.status}
- Timestamp: ${txDetails.timestamp}
` : ''}

Original Message: ${intent?.extraction?.originalMessage || metadataData?.originalMessage}`;
                navigator.clipboard.writeText(reportText);
              }}
              className="flex items-center space-x-1"
            >
              <Copy className="w-4 h-4" />
              <span>Export</span>
            </Button>
          </div>
        </div>

        {/* Classification & Status Header */}
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-green-800">
                <Zap className="w-5 h-5" />
                <span>Action: {classificationData?.actionSubtype || result.actionType}</span>
              </div>
              <Badge className={`${
                result.success ? 'bg-green-100 text-green-800 border-green-300' :
                result.executionStatus === 'failed' ? 'bg-red-100 text-red-800 border-red-300' :
                result.executionStatus === 'guidance_only' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                'bg-gray-100 text-gray-800 border-gray-300'
              }`}>
                {result.success ? '✅ EXECUTED' : 
                 result.executionStatus === 'failed' ? '❌ FAILED' :
                 result.executionStatus === 'guidance_only' ? '💡 GUIDANCE' : 'PENDING'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-green-700">{classificationData?.reasoning}</p>
            {result.userMessage && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">{result.userMessage}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaction Details */}
        {result.transaction && (
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-blue-800">
                <ArrowUpDown className="w-5 h-5" />
                <span>Transaction Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                          <p className="text-xs text-gray-600 font-medium">Currency</p>
                          <p className="font-bold text-blue-800">{safeRender(result.transaction.fromToken) || 'HBAR'}</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                          <p className="text-xs text-gray-600 font-medium">Amount</p>
                          <p className="font-bold text-blue-800">{safeRender(result.transaction.amount)}</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                          <p className="text-xs text-gray-600 font-medium">Recipient</p>
                          <p className="font-bold text-blue-800 text-xs">
                            {safeRender(result.execution?.parsedRequest?.resolvedRecipient || result.transaction.recipient) || 'Unknown'}
                          </p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                          <p className="text-xs text-gray-600 font-medium">Gas Fee</p>
                          <p className="font-bold text-blue-800">{safeRender(result.transaction.estimatedGasFee)} HBAR</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                          <p className="text-xs text-gray-600 font-medium">Est. Time</p>
                          <p className="font-bold text-blue-800">{safeRender(result.transaction.estimatedTime)}s</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                          <p className="text-xs text-gray-600 font-medium">Confidence</p>
                          <p className="font-bold text-green-600">{safeRender(result.transaction.confidence)}%</p>
                        </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Validation Status */}
        {result.validation && (
          <Card className="bg-purple-50 border-purple-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-purple-800">
                <CheckCircle className="w-5 h-5" />
                <span>Validation Results</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${result.validation.balanceCheck ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm">Balance Check</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${result.validation.addressValid ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm">Address Valid</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${result.validation.networkStatus === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm">Network Status</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm">Success Rate: {result.validation.estimatedSuccess}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Execution Results */}
        {(result.execution || result.transactionDetails) && (
          <Card className={(result.success || result.execution?.success) ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200" : "bg-gradient-to-br from-red-50 to-pink-50 border-red-200"}>
            <CardHeader className="pb-3">
              <CardTitle className={`flex items-center space-x-2 ${(result.success || result.execution?.success) ? 'text-green-800' : 'text-red-800'}`}>
                {(result.success || result.execution?.success) ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <span>Execution Result</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(result.success || result.execution?.success) ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-sm font-medium text-green-700">Transaction executed successfully!</p>
                  </div>
                  
                  {(result.transactionDetails || result.execution?.transactionDetails) && (
                    <div className="grid gap-3">
                      <div className="p-4 bg-white rounded-lg border border-green-200">
                        <h4 className="font-semibold text-green-800 mb-2">Transaction Details</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Transaction ID:</span>
                            <code className="bg-green-100 px-2 py-1 rounded text-green-800">
                              {safeRender(transactionDetails?.transactionId)}
                            </code>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">From Account:</span>
                            <span className="font-mono">
                              {safeRender(transactionDetails?.fromAccount)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">To Account:</span>
                            <span className="font-mono">
                              {safeRender(transactionDetails?.toAccount)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Amount:</span>
                            <span className="font-semibold">
                              {safeRender(transactionDetails?.amount)} {transactionDetails?.tokenId || 'HBAR'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <Badge className="bg-green-100 text-green-800">
                              {safeRender(transactionDetails?.status)}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Timestamp:</span>
                            <span>
                              {transactionDetails?.timestamp 
                                ? new Date(transactionDetails.timestamp).toLocaleString() 
                                : 'N/A'}
                            </span>
                          </div>
                          {transactionDetails?.memo && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Memo:</span>
                              <span className="italic">
                                {safeRender(transactionDetails.memo)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-sm text-red-700">❌ Execution failed: {safeRender(result.execution?.error || result.error || 'Unknown error')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Warnings (for swap errors like unsupported tokens) */}
        {result.warnings && result.warnings.length > 0 && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-yellow-800">
                <AlertTriangle className="w-5 h-5" />
                <span>Warnings</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.warnings.map((warning: string, index: number) => (
                  <div key={index} className="flex items-start space-x-2 p-2 bg-yellow-100 rounded">
                    <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-yellow-700">{warning}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recommendations (for swap alternatives) */}
        {result.recommendations && result.recommendations.length > 0 && (
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-blue-800">
                <Lightbulb className="w-5 h-5" />
                <span>Recommendations</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.recommendations.map((recommendation: string, index: number) => (
                  <div key={index} className="flex items-start space-x-2 p-2 bg-blue-100 rounded">
                    <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-700">{recommendation}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alerts */}
        {result.alerts && result.alerts.length > 0 && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-yellow-800">
                <AlertTriangle className="w-5 h-5" />
                <span>Important Alerts</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.alerts.map((alert: string, index: number) => (
                  <div key={index} className="flex items-start space-x-2 p-2 bg-yellow-100 rounded">
                    <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-yellow-700">{alert}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Processing Metadata */}
        <Card className="bg-gray-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-gray-700">
              <Activity className="w-5 h-5" />
              <span>Processing Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div><strong>Processing Time:</strong> {metadataData?.processingTime}</div>
              <div><strong>Processing Method:</strong> {processing?.processingMethod}</div>
              <div><strong>Router Version:</strong> {metadataData?.routerVersion}</div>
              <div><strong>Agent ID:</strong> {safeRender(metadataData?.agentId)}</div>
              <div><strong>Original Message:</strong> "{intent?.extraction?.originalMessage || metadataData?.originalMessage}"</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderStrategyResponse = (data: any) => {
    const { processing, classification } = data;
    const result = processing?.result || {};
    const strategy = result.strategy || {};
    
    return (
      <div className="mt-4 space-y-4">
        {/* Strategy Overview */}
        <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-purple-800">
                <Target className="w-5 h-5" />
                <span>{strategy.name || 'Strategy Analysis'}</span>
              </div>
              <Badge className="bg-purple-100 text-purple-800 border-purple-300">
                {strategy.riskLevel ? `Risk Level: ${strategy.riskLevel}/100` : 'Strategy'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-purple-700">{classification?.reasoning}</p>
              
              {/* Strategy Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <p className="text-xs text-gray-600">Expected Return</p>
                  <p className="font-bold text-purple-800">{strategy.expectedReturn}%</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <p className="text-xs text-gray-600">Time Horizon</p>
                  <p className="font-bold text-purple-800">{strategy.timeHorizon}</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <p className="text-xs text-gray-600">Confidence</p>
                  <p className="font-bold text-purple-800">{strategy.confidenceScore}%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Market Analysis */}
        {result.analysis && (
          <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-blue-800">
                <BarChart3 className="w-5 h-5" />
                <span>Market Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <p className="text-xs text-gray-600">Market Phase</p>
                  <p className="font-bold text-blue-800 capitalize">{result.analysis.marketPhase}</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <p className="text-xs text-gray-600">Opportunity Score</p>
                  <p className="font-bold text-blue-800">{result.analysis.opportunityScore}/100</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <p className="text-xs text-gray-600">Risk/Reward</p>
                  <p className="font-bold text-blue-800">{result.analysis.riskReward}x</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <p className="text-xs text-gray-600">Market Sentiment</p>
                  <p className="font-bold text-blue-800 capitalize">{result.analysis.marketSentiment}</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <p className="text-xs text-gray-600">Ecosystem Health</p>
                  <p className="font-bold text-blue-800">{result.analysis.ecosystemHealth}/100</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Risk Assessment */}
        {result.riskAssessment && (
          <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-orange-800">
                <AlertTriangle className="w-5 h-5" />
                <span>Risk Assessment</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <p className="text-xs text-gray-600">Portfolio Risk</p>
                  <p className="font-bold text-orange-800">{result.riskAssessment.portfolioRisk}/100</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <p className="text-xs text-gray-600">Max Drawdown</p>
                  <p className="font-bold text-orange-800">{result.riskAssessment.maxDrawdown}%</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <p className="text-xs text-gray-600">Volatility</p>
                  <p className="font-bold text-orange-800">{result.riskAssessment.volatility}%</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <p className="text-xs text-gray-600">Correlation</p>
                  <p className="font-bold text-orange-800">{result.riskAssessment.correlation}</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <p className="text-xs text-gray-600">Diversification</p>
                  <p className="font-bold text-orange-800">{result.riskAssessment.diversificationScore}/100</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Plan */}
        {result.actionPlan && (
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-green-800">
                <CheckCircle className="w-5 h-5" />
                <span>Action Plan</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Timeline */}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Total Timeline:</span>
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                    {result.actionPlan.totalEstimatedDuration || 'Not specified'}
                  </Badge>
                </div>
                {result.actionPlan.riskManagement && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Risk Score:</span>
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                      {result.actionPlan.riskManagement.riskScore || 'N/A'}
                    </Badge>
                  </div>
                )}

                {/* Phases */}
                <div className="space-y-3 mt-4">
                  {result.actionPlan.phases && result.actionPlan.phases.map((phase: any, index: number) => (
                    <div key={index} className="p-3 bg-white rounded-lg border border-green-200">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold text-green-800">
                          Phase {phase.phaseNumber}: {phase.phaseName || `Phase ${phase.phaseNumber}`}
                        </h4>
                        <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
                          {phase.duration || 'No duration'}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {phase.tasks && phase.tasks.map((task: any, taskIndex: number) => (
                          <div key={taskIndex} className="flex items-center space-x-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span>
                              {task.taskType} {task.tokenSymbol} ({task.allocation})
                              {task.targetPrice && ` @ $${task.targetPrice}`}
                            </span>
                            <Badge className={`ml-auto ${
                              task.priority === 'high' ? 'bg-red-100 text-red-800' :
                              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {task.priority || 'medium'} priority
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Legacy Implementation Plan (fallback) */}
        {result.implementation && !result.actionPlan && (
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-green-800">
                <CheckCircle className="w-5 h-5" />
                <span>Implementation Plan</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Timeline */}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Total Timeline:</span>
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                    {result.implementation.totalTimeline}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Rebalancing:</span>
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                    {result.implementation.rebalanceFreq}
                  </Badge>
                </div>

                {/* Phases */}
                <div className="space-y-3 mt-4">
                  {result.implementation.phases && result.implementation.phases.map((phase: any, index: number) => (
                    <div key={index} className="p-3 bg-white rounded-lg border border-green-200">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold text-green-800">Phase {phase.phase}</h4>
                        <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
                          {phase.duration}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {phase.actions && phase.actions.map((action: string, actionIndex: number) => (
                          <div key={actionIndex} className="flex items-center space-x-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span>{action}</span>
                            <Badge className="ml-auto bg-blue-100 text-blue-800">
                              {phase.capital}% Capital
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Strategy Execution Status */}
        {data.metadata && (data.metadata.savedStrategy || data.metadata.executorAgent) && (
          <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-blue-800">
                <Settings className="w-5 h-5" />
                <span>Strategy Execution Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.metadata.savedStrategy && (
                  <div className="p-3 bg-white rounded-lg border border-blue-200">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-blue-800">Strategy Database</span>
                      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                        {data.metadata.savedStrategy.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Strategy ID: {data.metadata.savedStrategy.id}
                    </p>
                    <p className="text-sm text-gray-600">
                      Execution Status: {data.metadata.savedStrategy.executionStatus}
                    </p>
                  </div>
                )}
                
                {data.metadata.standardAgent && (
                  <div className="p-3 bg-white rounded-lg border border-blue-200">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-blue-800">Strategy Agent</span>
                      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                        Created
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Agent ID: {data.metadata.standardAgent.id}
                    </p>
                    <p className="text-sm text-gray-600">
                      Name: {data.metadata.standardAgent.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      Linked to User: {data.metadata.standardAgent.linkedToUser ? 'Yes' : 'No'}
                    </p>
                  </div>
                )}

                {data.metadata.executorAgent && (
                  <div className="p-3 bg-white rounded-lg border border-blue-200">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-blue-800">Executor Agent</span>
                      <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
                        {data.metadata.executorAgent.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Agent ID: {data.metadata.executorAgent.id}
                    </p>
                    <p className="text-sm text-gray-600">
                      Can Execute: {data.metadata.executorAgent.capabilities?.canExecuteTrades ? 'Yes' : 'No'}
                    </p>
                  </div>
                )}
                
                {data.metadata.marketDataUsed && (
                  <div className="p-3 bg-white rounded-lg border border-blue-200">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-blue-800">Market Data</span>
                      <Badge variant="outline" className="bg-cyan-100 text-cyan-800 border-cyan-300">
                        Real-time
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Tokens Analyzed: {data.metadata.marketDataUsed.tokensAnalyzed}
                    </p>
                    <p className="text-sm text-gray-600">
                      Data Source: {data.metadata.marketDataUsed.dataSource}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Market Context */}
        {result.marketContext && (
          <Card className="bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-gray-800">
                <BarChart3 className="w-5 h-5" />
                <span>Market Context</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <p className="text-xs text-gray-600">Market Cap</p>
                  <p className="font-bold text-gray-800">
                    ${result.marketContext.marketCap ? (result.marketContext.marketCap / 1000000).toFixed(1) + 'M' : 'N/A'}
                  </p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <p className="text-xs text-gray-600">24h Volume</p>
                  <p className="font-bold text-gray-800">
                    ${result.marketContext.totalVolume ? (result.marketContext.totalVolume / 1000000).toFixed(1) + 'M' : 'N/A'}
                  </p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <p className="text-xs text-gray-600">Market Trend</p>
                  <p className={`font-bold ${
                    result.marketContext.marketTrend === 'bullish' ? 'text-green-600' :
                    result.marketContext.marketTrend === 'bearish' ? 'text-red-600' :
                    result.marketContext.marketTrend === 'volatile' ? 'text-orange-600' :
                    'text-gray-600'
                  }`}>
                    {result.marketContext.marketTrend || 'Unknown'}
                  </p>
                </div>
                {result.marketContext.volatilityIndex !== undefined && (
                  <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                    <p className="text-xs text-gray-600">Volatility</p>
                    <p className="font-bold text-orange-600">
                      {result.marketContext.volatilityIndex}%
                    </p>
                  </div>
                )}
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <p className="text-xs text-gray-600">Data Updated</p>
                  <p className="font-bold text-blue-600">
                    {result.marketContext.timestamp ? 'Real-time' : 'Static'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Performance Projections */}
        {result.performance && (
          <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-yellow-800">
                <TrendingUp className="w-5 h-5" />
                <span>Performance Projections</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <p className="text-xs text-gray-600">3-Month Target</p>
                  <p className="font-bold text-yellow-800">{result.performance.target3m}%</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <p className="text-xs text-gray-600">6-Month Target</p>
                  <p className="font-bold text-yellow-800">{result.performance.target6m}%</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <p className="text-xs text-gray-600">Success Probability</p>
                  <p className="font-bold text-yellow-800">{result.performance.probability}%</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <p className="text-xs text-gray-600">Best Case</p>
                  <p className="font-bold text-green-600">+{result.performance.bestCase}%</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <p className="text-xs text-gray-600">Worst Case</p>
                  <p className="font-bold text-red-600">{result.performance.worstCase}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderFeedbackResponse = (data: any) => {
    const { processing, classification } = data;
    const result = processing?.result || {};
    
    return (
      <div className="mt-4 space-y-4">
        {/* Classification Header */}
        <Card className="bg-orange-50 border-orange-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-orange-800">
              <MessageSquare className="w-5 h-5" />
              <span>Feedback Analysis</span>
              {result.sentiment && (
                <Badge className={`${
                  result.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                  result.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {result.sentiment.toUpperCase()}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-700">{classification?.reasoning}</p>
          </CardContent>
        </Card>

        {/* Analysis */}
        {result.analysis && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <span>Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.analysis}</p>
            </CardContent>
          </Card>
        )}

        {/* Key Insights */}
        {result.keyInsights && result.keyInsights.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <Lightbulb className="w-5 h-5 text-yellow-600" />
                <span>Key Insights</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.keyInsights.map((insight: string, index: number) => (
                  <div key={index} className="flex items-start space-x-2 p-2 bg-blue-50 rounded">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-700">{insight}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Suggestions */}
        {result.suggestions && result.suggestions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>Suggestions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.suggestions.map((suggestion: string, index: number) => (
                  <div key={index} className="flex items-start space-x-2 p-2 bg-green-50 rounded">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-green-700">{suggestion}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* General Response */}
        {result.response && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-gray-600" />
                <span>Feedback Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.response}</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderResponseData = (message: Message) => {
    if (!message.responseData || !message.classification) return null;

    try {
      switch (message.classification.category) {
        case 'information':
          return renderInformationResponse(message.responseData);
        case 'action':
          return renderActionResponse(message.responseData);
        case 'strategy':
          return renderStrategyResponse(message.responseData);
        case 'feedback':
          return renderFeedbackResponse(message.responseData);
        default:
          return null;
      }
    } catch (error) {
      console.error('Error rendering response data:', error);
      return (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-800 font-medium">Response Error</div>
          <div className="text-red-600 text-sm mt-1">
            Unable to display response data. Please check the console for details.
          </div>
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0 ring-2 ring-yellow-300 ring-offset-2">
                <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">Master Agent</h1>
                  <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-none text-xs">
                    ⭐ AI Assistant
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs sm:text-sm text-gray-600">Online • Ready to Help</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
            <div className="space-y-4 sm:space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex max-w-[95%] ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start space-x-2 sm:space-x-3`}>
                    {/* Avatar */}
                    <div className={`flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${
                      message.sender === 'user' 
                        ? 'bg-gradient-to-r from-purple-500 to-blue-500' 
                        : 'bg-gradient-to-r from-yellow-400 to-orange-500'
                    }`}>
                      {message.sender === 'user' ? (
                        <User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                      ) : (
                        <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                      )}
                    </div>
                    
                    {/* Message Content */}
                    <div className={`group relative ${message.sender === 'user' ? 'mr-2 sm:mr-3' : 'ml-2 sm:ml-3'}`}>
                      <div className={`px-3 sm:px-4 py-2 sm:py-3 rounded-2xl ${
                        message.sender === 'user'
                          ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                          : 'bg-white border border-gray-200 text-gray-900 shadow-sm'
                      }`}>
                        {message.content.includes('<div') ? (
                          <div 
                            className="text-sm sm:text-base leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: message.content }}
                          />
                        ) : (
                        <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                          {isSafeToRender(message.content) ? message.content : safeRender(message.content)}
                        </p>
                        )}
                        
                        {/* Classification Badge */}
                        {message.classification && message.sender === 'agent' && (
                          <div className="mt-3 flex items-center space-x-2">
                            {getClassificationIcon(message.classification.category)}
                            <Badge className={getClassificationColor(message.classification.category)}>
                              {message.classification.category.toUpperCase()}
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      {/* Interactive Components for Missing Arguments */}
                      {message.interactiveData && (
                        <div className="mt-4">
                          <InteractiveArgumentComponents
                            interactiveData={message.interactiveData}
                            onSubmit={(responses) => handleInteractiveSubmit(responses, message.id)}
                            onCancel={() => handleInteractiveCancel(message.id)}
                          />
                        </div>
                      )}
                      
                      {/* Detailed Response Data */}
                      {renderResponseData(message)}
                      
                      {/* Message Actions */}
                      <div className={`absolute top-0 ${message.sender === 'user' ? 'right-full mr-2' : 'left-full ml-2'} opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden sm:flex`}>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:bg-gray-100"
                            onClick={() => copyMessage(message.content)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          {message.sender === 'agent' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 hover:bg-gray-100"
                              >
                                <ThumbsUp className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 hover:bg-gray-100"
                              >
                                <ThumbsDown className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Timestamp */}
                      <p className={`text-xs text-gray-500 mt-1 ${message.sender === 'user' ? 'text-right' : 'text-left'}`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-2 sm:space-x-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center">
                      <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                    <div className="bg-white border border-gray-200 px-3 sm:px-4 py-2 sm:py-3 rounded-2xl shadow-sm">
                      <div className="flex space-x-1 items-center">
                        <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                        <span className="text-sm text-gray-600 ml-2">Analyzing and processing your request...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me about crypto, trading strategies, market analysis..."
                className="w-full pr-10 sm:pr-12 rounded-full border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                disabled={isTyping}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || isTyping}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-full h-8 w-8 sm:h-10 sm:w-10 p-0"
              >
                <Send className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}