"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  EyeOff, 
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Bot
} from 'lucide-react';



const cryptoData = [
  { symbol: 'BTC', name: 'Bitcoin', balance: '0.5432', value: '$27,564.32', change: '+5.2%', positive: true },
  { symbol: 'ETH', name: 'Ethereum', balance: '12.8910', value: '$19,823.45', change: '-2.1%', positive: false },
  { symbol: 'SOL', name: 'Solana', balance: '245.67', value: '$8,932.14', change: '+12.8%', positive: true },
  { symbol: 'ADA', name: 'Cardano', balance: '1,234.56', value: '$432.98', change: '+8.3%', positive: true },
];

const transactions = [
  { id: 1, type: 'buy', asset: 'BTC', amount: '0.0234', value: '$1,234.56', time: '2 minutes ago' },
  { id: 2, type: 'sell', asset: 'ETH', amount: '2.1', value: '$3,456.78', time: '1 hour ago' },
  { id: 3, type: 'buy', asset: 'SOL', amount: '45.67', value: '$1,890.23', time: '3 hours ago' },
  { id: 4, type: 'sell', asset: 'ADA', amount: '234.56', value: '$89.12', time: '1 day ago' },
];

export default function WalletDashboard() {
  const [hideBalances, setHideBalances] = useState(false);
  const router = useRouter();
  const totalBalance = '$56,752.89';

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Portfolio Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600">Track your crypto investments and manage your portfolio</p>
        </div>
        <Button
          onClick={() => router.push('/agent/master')}
          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90 text-white font-semibold px-4 sm:px-6 py-2 sm:py-3 rounded-xl shadow-lg transition-all duration-200 hover:scale-105 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          Create New Agent
        </Button>
      </div>

      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="lg:col-span-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Total Portfolio Value</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setHideBalances(!hideBalances)}
                className="text-white hover:bg-white/20"
              >
                {hideBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h2 className="text-3xl sm:text-4xl font-bold">
                {hideBalances ? '•••••••' : totalBalance}
              </h2>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-green-300" />
                <span className="text-green-300">+8.5% ($4,234.12)</span>
                <span className="text-purple-200 hidden sm:inline">Last 24h</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3">
            <Button className="w-full bg-green-500 hover:bg-green-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Buy Crypto
            </Button>
            <Button variant="outline" className="w-full">
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Send
            </Button>
            <Button variant="outline" className="w-full">
              <ArrowDownRight className="w-4 h-4 mr-2" />
              Receive
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Holdings */}
      <Card>
        <CardHeader>
          <CardTitle>Your Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:space-y-4">
            {cryptoData.map((crypto, index) => (
              <div key={index} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-orange-400 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs sm:text-sm">{crypto.symbol}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{crypto.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-600">{crypto.symbol}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-sm sm:text-base">
                      {hideBalances ? '•••••' : crypto.balance}
                    </span>
                    <span className={`text-xs sm:text-sm ${crypto.positive ? 'text-green-600' : 'text-red-600'}`}>
                      {crypto.change}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {hideBalances ? '•••••••' : crypto.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${
                    transaction.type === 'buy' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {transaction.type === 'buy' ? <ArrowDownRight className="w-3 h-3 sm:w-4 sm:h-4" /> : <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4" />}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm sm:text-base">
                      {transaction.type === 'buy' ? 'Bought' : 'Sold'} {transaction.asset}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600">{transaction.time}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm sm:text-base">{transaction.amount} {transaction.asset}</p>
                  <p className="text-xs sm:text-sm text-gray-600">{transaction.value}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}