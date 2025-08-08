'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthWrapper';
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
  MessageSquare
} from 'lucide-react';

export default function AgentsPage() {
  const { user, logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('Created');

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 bg-slate-800 text-white flex flex-col">
        {/* Logo */}
        <div className="flex items-center p-6 border-b border-slate-700">
          <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
            <Wallet className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold">CryptoVault</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6">
          <div className="space-y-1">
            <Link href="/dashboard" className="flex items-center px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
              <Home className="w-5 h-5 mr-3" />
              Dashboard
            </Link>
            
            <Link href="/wallet" className="flex items-center px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
              <Wallet className="w-5 h-5 mr-3" />
              Wallet
            </Link>
            
            <Link href="/trading" className="flex items-center px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
              <TrendingUp className="w-5 h-5 mr-3" />
              Trading
            </Link>
            
            <Link href="/cards" className="flex items-center px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
              <CreditCard className="w-5 h-5 mr-3" />
              Cards
            </Link>
            
            <Link href="/analytics" className="flex items-center px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
              <BarChart3 className="w-5 h-5 mr-3" />
              Analytics
            </Link>
            
            <Link href="/activity" className="flex items-center px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
              <Activity className="w-5 h-5 mr-3" />
              Activity
            </Link>
            
            <Link href="/agents" className="flex items-center px-4 py-3 rounded-lg bg-blue-600 text-white transition-colors">
              <Bot className="w-5 h-5 mr-3" />
              Agents
              <span className="ml-auto bg-slate-600 text-xs px-2 py-1 rounded">0</span>
            </Link>
            
            <Link href="/profile" className="flex items-center px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
              <User className="w-5 h-5 mr-3" />
              Profile
            </Link>
            
            <Link href="/settings" className="flex items-center px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
              <Settings className="w-5 h-5 mr-3" />
              Settings
            </Link>
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-sm font-medium">{user?.name?.charAt(0) || 'J'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || 'John Doe'}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email || 'john@example.com'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mr-4">
                <Sparkles className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">AI Agents</h1>
                <p className="text-gray-600">Your intelligent crypto assistants working 24/7</p>
              </div>
            </div>
            <Link href="/agent/default">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create New Agent
              </Button>
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                    <Bot className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900">0</p>
                    <p className="text-sm text-gray-500">Total Agents</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                    <Activity className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900">0</p>
                    <p className="text-sm text-gray-500">Active Today</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                    <MessageSquare className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900">0</p>
                    <p className="text-sm text-gray-500">Conversations</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900">0</p>
                    <p className="text-sm text-gray-500">Days Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter Bar */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search agents by name or type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Sort by</span>
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-sm border border-gray-300 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Created">Created</option>
                  <option value="Name">Name</option>
                  <option value="Activity">Activity</option>
                </select>
                <Button variant="outline" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Empty State */}
          <div className="flex-1 flex flex-col items-center justify-center py-16">
            <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mb-6">
              <Bot className="w-12 h-12 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Agents Yet</h3>
            <p className="text-gray-600 text-center max-w-md mb-8">
              Create your first AI agent to get started with automated crypto assistance and intelligent portfolio management.
            </p>
            <Link href="/agent/default">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Agent
              </Button>
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}