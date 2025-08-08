'use client';

import React from 'react';
import { useAuth } from '@/components/auth/AuthWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  TrendingUp, 
  Wallet, 
  ExternalLink,
  Activity,
  DollarSign
} from 'lucide-react';
import Link from 'next/link';

export default function TradingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold">Trading</h1>
              <Badge variant="secondary">Live</Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Trading Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            DragonSwap Trading
          </h2>
          <p className="text-gray-600">
            Trade cryptocurrencies on the SEI network with low fees and fast transactions.
          </p>
        </div>

        {/* Trading Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Trading Panel */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  DragonSwap Interface
                </CardTitle>
                <CardDescription>
                  Connect to DragonSwap to start trading
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 p-6 rounded-lg text-center">
                  <div className="mb-4">
                    <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <ExternalLink className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Launch DragonSwap</h3>
                  <p className="text-gray-600 mb-4">
                    Open the DragonSwap interface to start trading with your connected wallet.
                  </p>
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                    Open DragonSwap
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </div>

                {/* Quick Trade Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">SEI → USDT</span>
                      <Badge variant="outline">0.3%</Badge>
                    </div>
                    <p className="text-sm text-gray-600">Trade SEI for stable USDT</p>
                  </div>

                  <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">SEI → WBTC</span>
                      <Badge variant="outline">0.3%</Badge>
                    </div>
                    <p className="text-sm text-gray-600">Get exposure to Bitcoin</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Wallet Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wallet className="h-5 w-5 mr-2" />
                  Your Wallet
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">SEI</span>
                    <span className="font-medium">0.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">USDT</span>
                    <span className="font-medium">0.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">WBTC</span>
                    <span className="font-medium">0.00</span>
                  </div>
                  <hr />
                  <div className="flex justify-between font-semibold">
                    <span>Total Value</span>
                    <span>$0.00</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Market Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Market Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">SEI Price</span>
                    <span className="font-medium text-green-600">$0.45</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">24h Volume</span>
                    <span className="font-medium">$2.1M</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Active Pools</span>
                    <span className="font-medium">12</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Trades */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Trades</CardTitle>
                <CardDescription>Your trading history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Activity className="mx-auto h-8 w-8 mb-2 text-gray-400" />
                  <p>No trades yet</p>
                  <p className="text-sm">Start trading to see your history</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
} 