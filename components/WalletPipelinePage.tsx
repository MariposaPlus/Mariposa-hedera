'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthWrapper';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Wallet, 
  TrendingUp, 
  Bot, 
  Settings, 
  LogOut, 
  Copy,
  ExternalLink,
  DollarSign,
  Activity,
  Users,
  BarChart3,
  CreditCard,
  User,
  Home,
  Eye,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
  MoreVertical,
  Calendar,
  Sparkles,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  Repeat,
  Target,
  Shield,
  Coins,
  Mail,
  Zap,
  CheckCircle,
  Circle,
  Maximize,
  Minimize,
  Lock,
  Menu,
  X,
  GitMerge,
  GitBranch,
  Edit,
  ChevronRight
} from 'lucide-react';

interface ActionType {
  id: string;
  name: string;
  icon: any;
  color: string;
  bgColor: string;
}

interface CustomNodeData {
  title: string;
  description: string;
  status: 'configured' | 'not_configured';
  type: 'transfer' | 'swap' | 'strategy' | 'condition' | 'stake' | 'notification' | 'merge' | 'split';
  prompt?: string;
  onClick?: () => void;
}

// Custom Node Component
const CustomNode = ({ data }: { data: CustomNodeData }) => {
  const getNodeColor = (type: string) => {
    switch (type) {
      case 'transfer': return 'border-blue-500 bg-blue-50';
      case 'swap': return 'border-purple-500 bg-purple-50';
      case 'strategy': return 'border-green-500 bg-green-50';
      case 'condition': return 'border-pink-500 bg-pink-50';
      case 'stake': return 'border-red-500 bg-red-50';
      case 'notification': return 'border-orange-500 bg-orange-50';
      case 'merge': return 'border-indigo-500 bg-indigo-50';
      case 'split': return 'border-yellow-500 bg-yellow-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const isCondition = data.type === 'condition';
  const isSplit = data.type === 'split';

  return (
    <div className={`w-80 p-4 rounded-lg border-2 ${getNodeColor(data.type)} shadow-md cursor-pointer hover:shadow-lg transition-shadow relative`}
         onClick={() => data.onClick && data.onClick()}>
      
      {/* Multiple Input Handles for Merge nodes */}
      {data.type === 'merge' && (
        <>
          <Handle
            type="target"
            position={Position.Top}
            id="input-1"
            style={{ left: '25%', background: '#10b981', width: '12px', height: '12px' }}
          />
          <Handle
            type="target"
            position={Position.Top}
            id="input-2"
            style={{ left: '75%', background: '#10b981', width: '12px', height: '12px' }}
          />
        </>
      )}

      {/* Single Input Handle for other nodes */}
      {data.type !== 'merge' && (
        <Handle
          type="target"
          position={Position.Top}
          style={{ background: '#10b981', width: '12px', height: '12px' }}
        />
      )}

      <div className="mb-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{data.title}</h3>
            <p className="text-sm text-gray-600">{data.description}</p>
          </div>
          <Edit className="w-4 h-4 text-gray-400" />
        </div>
        {data.prompt && (
          <p className="text-xs text-gray-500 mt-2 bg-white p-2 rounded">
            Prompt: {data.prompt.substring(0, 50)}...
          </p>
        )}
      </div>
      
      <div className="flex items-center justify-center mb-2">
        <span className={`text-sm font-medium px-3 py-1 rounded-full ${
          data.status === 'configured' 
            ? 'bg-green-100 text-green-700' 
            : 'bg-orange-100 text-orange-700'
        }`}>
          {data.status === 'configured' ? 'Configured' : 'Not configured'}
        </span>
      </div>

      {/* Conditional Output Handles (True/False) */}
      {isCondition && (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            style={{ left: '33%', background: '#10b981', width: '12px', height: '12px' }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            style={{ left: '67%', background: '#ef4444', width: '12px', height: '12px' }}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>True</span>
            <span>False</span>
          </div>
        </>
      )}

      {/* Split Output Handles (Multiple outputs) */}
      {isSplit && (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="output-1"
            style={{ left: '25%', background: '#3b82f6', width: '12px', height: '12px' }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="output-2"
            style={{ left: '50%', background: '#3b82f6', width: '12px', height: '12px' }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="output-3"
            style={{ left: '75%', background: '#3b82f6', width: '12px', height: '12px' }}
          />
        </>
      )}

      {/* Single Output Handle for other nodes */}
      {!isCondition && !isSplit && (
        <Handle
          type="source"
          position={Position.Bottom}
          style={{ background: '#3b82f6', width: '12px', height: '12px' }}
        />
      )}
    </div>
  );
};

const nodeTypes = {
  customNode: CustomNode,
};

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

export default function WalletPipelinePage() {
  const { user, logout } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [prompt, setPrompt] = useState('');
  const [nodeCounter, setNodeCounter] = useState(1);

  const openNodeModal = useCallback((node: Node) => {
    setSelectedNode(node);
    setPrompt(node.data?.prompt || '');
    setShowModal(true);
    console.log('🔧 Opening configuration for:', node.data.title);
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const actionTypes: ActionType[] = [
    { id: 'transfer', name: 'Transfer', icon: ArrowRight, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { id: 'swap', name: 'Swap', icon: Repeat, color: 'text-purple-600', bgColor: 'bg-purple-100' },
    { id: 'strategy', name: 'Strategy', icon: Target, color: 'text-green-600', bgColor: 'bg-green-100' },
    { id: 'condition', name: 'Condition', icon: Shield, color: 'text-pink-600', bgColor: 'bg-pink-100' },
    { id: 'stake', name: 'Stake', icon: Coins, color: 'text-red-600', bgColor: 'bg-red-100' },
    { id: 'notification', name: 'Email', icon: Mail, color: 'text-orange-600', bgColor: 'bg-orange-100' },
    { id: 'merge', name: 'Merge', icon: GitMerge, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
    { id: 'split', name: 'Split', icon: GitBranch, color: 'text-yellow-600', bgColor: 'bg-yellow-100' }
  ];

  const onConnect = useCallback((params: Connection) => {
    console.log('🔗 Connection created:', params);
    setEdges((eds) => addEdge(params, eds));
  }, [setEdges]);

  const saveNodePrompt = useCallback(() => {
    if (selectedNode) {
      setNodes((nds) => 
        nds.map((node) => 
          node.id === selectedNode.id 
            ? { 
                ...node, 
                data: { 
                  ...node.data, 
                  prompt, 
                  status: 'configured' 
                } 
              }
            : node
        )
      );
      console.log(`💾 Saved prompt for ${selectedNode.data.title}:`, prompt);
      setShowModal(false);
      setSelectedNode(null);
      setPrompt('');
    }
  }, [selectedNode, prompt, setNodes]);

  const addNewStep = useCallback((actionType: string) => {
    const newNodeId = `node-${nodeCounter}`;
    const actionTypeData = actionTypes.find(type => type.id === actionType);
    
    console.log(`🆕 Adding new ${actionType} node:`, {
      id: newNodeId,
      type: actionType,
      timestamp: new Date().toISOString()
    });

    const newNode: Node = {
      id: newNodeId,
      type: 'customNode',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: {
        title: `${actionTypeData?.name || actionType} ${nodeCounter}`,
        description: `Configure ${actionType} action`,
        status: 'not_configured',
        type: actionType as any,
        onClick: () => openNodeModal(newNode)
      }
    };

    setNodes((nds) => {
      const updatedNodes = nds.concat(newNode);
      // Update the onClick for the new node after it's been added
      setTimeout(() => {
        setNodes((currentNodes) => 
          currentNodes.map((node) => 
            node.id === newNodeId 
              ? { ...node, data: { ...node.data, onClick: () => openNodeModal(node) } }
              : node
          )
        );
      }, 0);
      return updatedNodes;
    });
    setNodeCounter(nodeCounter + 1);

    console.log('📊 Current pipeline state:', {
      totalNodes: nodes.length + 1,
      totalEdges: edges.length,
      newNodeAdded: newNode
    });
  }, [nodeCounter, nodes.length, edges.length, actionTypes, setNodes, openNodeModal]);

  const steps = [
    { number: 1, title: 'Pipeline', active: currentStep === 1 },
    { number: 2, title: 'Configuration', active: currentStep === 2 },
    { number: 3, title: 'Conditions', active: currentStep === 3 },
    { number: 4, title: 'Review', active: currentStep === 4 }
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Floating Sidebar Toggle Button (when collapsed) */}
      {sidebarCollapsed && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="fixed top-4 left-4 z-50 p-3 bg-slate-800 text-white rounded-lg shadow-lg hover:bg-slate-700 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-80'} bg-slate-800 text-white flex flex-col transition-all duration-300`}>
        {/* Logo */}
        <div className="flex items-center p-6 border-b border-slate-700">
          <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
            <Wallet className="w-6 h-6" />
          </div>
          {!sidebarCollapsed && <h1 className="text-xl font-bold">CryptoVault</h1>}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="ml-auto p-2 rounded hover:bg-slate-700 transition-colors"
          >
            {sidebarCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6">
          <div className="space-y-1">
            <Link href="/dashboard" className={`flex items-center ${sidebarCollapsed ? 'px-3 py-3 justify-center' : 'px-4 py-3'} rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors`}>
              <Home className={`${sidebarCollapsed ? 'w-7 h-7' : 'w-5 h-5'} ${sidebarCollapsed ? '' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Dashboard'}
            </Link>
            
            <Link href="/wallet" className={`flex items-center ${sidebarCollapsed ? 'px-3 py-3 justify-center' : 'px-4 py-3'} rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors`}>
              <Wallet className={`${sidebarCollapsed ? 'w-7 h-7' : 'w-5 h-5'} ${sidebarCollapsed ? '' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Wallet'}
            </Link>
            
            <Link href="/trading" className={`flex items-center ${sidebarCollapsed ? 'px-3 py-3 justify-center' : 'px-4 py-3'} rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors`}>
              <TrendingUp className={`${sidebarCollapsed ? 'w-7 h-7' : 'w-5 h-5'} ${sidebarCollapsed ? '' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Trading'}
            </Link>
            
            <Link href="/cards" className={`flex items-center ${sidebarCollapsed ? 'px-3 py-3 justify-center' : 'px-4 py-3'} rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors`}>
              <CreditCard className={`${sidebarCollapsed ? 'w-7 h-7' : 'w-5 h-5'} ${sidebarCollapsed ? '' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Cards'}
            </Link>
            
            <Link href="/analytics" className={`flex items-center ${sidebarCollapsed ? 'px-3 py-3 justify-center' : 'px-4 py-3'} rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors`}>
              <BarChart3 className={`${sidebarCollapsed ? 'w-7 h-7' : 'w-5 h-5'} ${sidebarCollapsed ? '' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Analytics'}
            </Link>
            
            <Link href="/activity" className={`flex items-center ${sidebarCollapsed ? 'px-3 py-3 justify-center' : 'px-4 py-3'} rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors`}>
              <Activity className={`${sidebarCollapsed ? 'w-7 h-7' : 'w-5 h-5'} ${sidebarCollapsed ? '' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Activity'}
            </Link>
            
            <Link href="/agents" className={`flex items-center ${sidebarCollapsed ? 'px-3 py-3 justify-center' : 'px-4 py-3'} rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors`}>
              <Bot className={`${sidebarCollapsed ? 'w-7 h-7' : 'w-5 h-5'} ${sidebarCollapsed ? '' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Agents'}
              {!sidebarCollapsed && <span className="ml-auto bg-slate-600 text-xs px-2 py-1 rounded">0</span>}
            </Link>

            <Link href="/pipeline" className={`flex items-center ${sidebarCollapsed ? 'px-3 py-3 justify-center' : 'px-4 py-3'} rounded-lg bg-blue-600 text-white transition-colors`}>
              <Zap className={`${sidebarCollapsed ? 'w-7 h-7' : 'w-5 h-5'} ${sidebarCollapsed ? '' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Pipeline'}
            </Link>
            
            <Link href="/profile" className={`flex items-center ${sidebarCollapsed ? 'px-3 py-3 justify-center' : 'px-4 py-3'} rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors`}>
              <User className={`${sidebarCollapsed ? 'w-7 h-7' : 'w-5 h-5'} ${sidebarCollapsed ? '' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Profile'}
            </Link>
            
            <Link href="/settings" className={`flex items-center ${sidebarCollapsed ? 'px-3 py-3 justify-center' : 'px-4 py-3'} rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors`}>
              <Settings className={`${sidebarCollapsed ? 'w-7 h-7' : 'w-5 h-5'} ${sidebarCollapsed ? '' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Settings'}
            </Link>
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-sm font-medium">{user?.name?.charAt(0) || 'J'}</span>
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name || 'John Doe'}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email || 'john@example.com'}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with Steps */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Wallet Pipeline Builder</h1>
              <p className="text-gray-600">Create automated workflows for your crypto operations</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center space-x-8 mb-4">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                    step.active ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                  }`}>
                    {step.number}
                  </div>
                  <span className={`mt-2 text-sm ${step.active ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className="w-20 h-px bg-gray-300 mx-4 mt-[-20px]"></div>
                )}
              </div>
            ))}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-hidden flex">
          {/* Action Types Sidebar */}
          <div className="w-48 bg-white border-r border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Actions</h3>
            <div className="space-y-2">
              {actionTypes.map((actionType) => {
                const IconComponent = actionType.icon;
                return (
                  <button
                    key={actionType.id}
                    onClick={() => addNewStep(actionType.id)}
                    className={`w-full flex flex-col items-center p-3 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors`}
                  >
                    <div className={`w-8 h-8 ${actionType.bgColor} rounded-lg flex items-center justify-center mb-2`}>
                      <IconComponent className={`w-5 h-5 ${actionType.color}`} />
                    </div>
                    <span className="text-xs font-medium text-gray-700">{actionType.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Console Log Button */}
            <div className="mt-6 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700 mb-2">Check console for logs</p>
              <div className="text-xs text-gray-600">
                <div>Nodes: {nodes.length}</div>
                <div>Edges: {edges.length}</div>
              </div>
            </div>
          </div>

          {/* React Flow Canvas */}
          <div className="flex-1 relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              fitView
            >
              <Controls />
              <MiniMap />
              <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            </ReactFlow>
          </div>
        </main>

        {/* Footer Actions */}
        <footer className="bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" className="text-green-500 border-green-500 hover:bg-green-50">
              SAVE
            </Button>
            
            <div className="flex items-center space-x-4">
              <Button variant="outline" className="text-green-500 border-green-500 hover:bg-green-50">
                PREVIEW PIPELINE
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                NEXT
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </footer>
      </div>

      {/* Configuration Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Configure {selectedNode?.data.title}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Action Prompt
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Describe what this {selectedNode?.data.type} action should do. Be specific about conditions, amounts, and triggers.
                </p>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={`Example: ${getPromptExample(selectedNode?.data.type)}`}
                  className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              {/* Chat-like suggestions */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-2">💡 Suggestions:</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  {getPromptSuggestions(selectedNode?.data.type).map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => setPrompt(suggestion)}
                      className="block w-full text-left p-2 hover:bg-white rounded border-l-2 border-blue-300 hover:border-blue-500 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveNodePrompt}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={!prompt.trim()}
                >
                  Save Configuration
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions for modal suggestions
function getPromptExample(nodeType?: string): string {
  switch (nodeType) {
    case 'transfer': return 'Transfer 100 USDT to wallet 0x123... when portfolio value > $1000';
    case 'swap': return 'Swap 50% of SEI to USDT when SEI price > $0.50';
    case 'strategy': return 'Execute DCA strategy: buy $100 of BTC every week';
    case 'condition': return 'Check if portfolio value is above $5000 and BTC dominance > 50%';
    case 'stake': return 'Stake 1000 SEI tokens in validator pool with 12% APY';
    case 'notification': return 'Send email alert when trade is executed with profit/loss details';
    case 'merge': return 'Combine multiple signals before executing action';
    case 'split': return 'Distribute funds across multiple strategies based on risk level';
    default: return 'Describe the action this node should perform...';
  }
}

function getPromptSuggestions(nodeType?: string): string[] {
  switch (nodeType) {
    case 'transfer':
      return [
        'Transfer 10% of portfolio to cold storage when total value > $10,000',
        'Send 100 USDT to trading account every Monday',
        'Transfer profits to savings wallet when daily gain > 5%'
      ];
    case 'swap':
      return [
        'Swap 25% of SEI to USDT when SEI price drops below $0.40',
        'Exchange all USDT to BTC when BTC price < $40,000',
        'Swap 50% holdings to stablecoin when market volatility > 15%'
      ];
    case 'strategy':
      return [
        'Dollar Cost Average: Buy $100 BTC weekly regardless of price',
        'Momentum strategy: Buy when 7-day MA crosses above 21-day MA',
        'Mean reversion: Sell when RSI > 70, buy when RSI < 30'
      ];
    case 'condition':
      return [
        'Portfolio value > $5000 AND Bitcoin dominance > 50%',
        'Daily volume > 1M AND price volatility < 10%',
        'Fear & Greed index < 25 (Extreme Fear)'
      ];
    case 'stake':
      return [
        'Stake 1000 SEI with validator offering highest rewards',
        'Auto-compound staking rewards weekly',
        'Unstake 50% if validator performance drops below 95%'
      ];
    case 'merge':
      return [
        'Wait for both technical and fundamental signals',
        'Combine price alert with volume confirmation',
        'Merge multiple risk checks before proceeding'
      ];
    case 'split':
      return [
        'Split investment: 60% BTC, 30% ETH, 10% altcoins',
        'Distribute based on risk: Conservative/Moderate/Aggressive',
        'Split profits: 70% reinvest, 20% save, 10% withdraw'
      ];
    default:
      return ['Configure this action with specific parameters'];
  }
}