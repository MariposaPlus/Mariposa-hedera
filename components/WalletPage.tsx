"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Send, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Copy, 
  QrCode,
  History,
  Wallet,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  Search,
  Filter,
  Download
} from 'lucide-react';

const walletAssets = [
  { 
    symbol: 'BTC', 
    name: 'Bitcoin', 
    balance: '0.5432', 
    value: '$27,564.32', 
    change: '+5.2%', 
    positive: true,
    price: '$50,742.18',
    icon: '₿'
  },
  { 
    symbol: 'ETH', 
    name: 'Ethereum', 
    balance: '12.8910', 
    value: '$19,823.45', 
    change: '-2.1%', 
    positive: false,
    price: '$1,538.92',
    icon: 'Ξ'
  },
  { 
    symbol: 'SOL', 
    name: 'Solana', 
    balance: '245.67', 
    value: '$8,932.14', 
    change: '+12.8%', 
    positive: true,
    price: '$36.37',
    icon: '◎'
  },
  { 
    symbol: 'ADA', 
    name: 'Cardano', 
    balance: '1,234.56', 
    value: '$432.98', 
    change: '+8.3%', 
    positive: true,
    price: '$0.35',
    icon: '₳'
  },
  { 
    symbol: 'DOT', 
    name: 'Polkadot', 
    balance: '89.12', 
    value: '$567.89', 
    change: '-1.5%', 
    positive: false,
    price: '$6.37',
    icon: '●'
  },
];

const transactions = [
  { 
    id: 1, 
    type: 'receive', 
    asset: 'BTC', 
    amount: '0.0234', 
    value: '$1,234.56', 
    time: '2 minutes ago',
    status: 'completed',
    hash: '0x1234...5678'
  },
  { 
    id: 2, 
    type: 'send', 
    asset: 'ETH', 
    amount: '2.1', 
    value: '$3,456.78', 
    time: '1 hour ago',
    status: 'completed',
    hash: '0x2345...6789'
  },
  { 
    id: 3, 
    type: 'receive', 
    asset: 'SOL', 
    amount: '45.67', 
    value: '$1,890.23', 
    time: '3 hours ago',
    status: 'pending',
    hash: '0x3456...7890'
  },
  { 
    id: 4, 
    type: 'send', 
    asset: 'ADA', 
    amount: '234.56', 
    value: '$89.12', 
    time: '1 day ago',
    status: 'completed',
    hash: '0x4567...8901'
  },
];

export default function WalletPage() {
  const [hideBalances, setHideBalances] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  const totalBalance = '$56,752.89';
  const walletAddress = '0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4';

  const filteredAssets = walletAssets.filter(asset =>
    asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Wallet</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage your crypto assets and transactions</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button variant="outline" className="flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </Button>
          <Button className="bg-gradient-to-r from-purple-500 to-blue-500 hover:opacity-90">
            <QrCode className="w-4 h-4 mr-2" />
            Receive
          </Button>
        </div>
      </div>

      {/* Wallet Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="lg:col-span-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Total Balance</CardTitle>
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
            <div className="space-y-4">
              <h2 className="text-3xl sm:text-4xl font-bold">
                {hideBalances ? '•••••••' : totalBalance}
              </h2>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-green-300" />
                  <span className="text-green-300">+8.5% ($4,234.12)</span>
                  <span className="text-purple-200">Last 24h</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Wallet className="w-4 h-4" />
                  <span className="font-mono text-xs sm:text-sm">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(walletAddress)}
                    className="h-6 w-6 text-white hover:bg-white/20"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
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
              <ArrowDownLeft className="w-4 h-4 mr-2" />
              Receive
            </Button>
            <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white">
              <Send className="w-4 h-4 mr-2" />
              Send
            </Button>
            <Button variant="outline" className="w-full">
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Swap
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="assets" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assets" className="flex items-center space-x-2">
            <Wallet className="w-4 h-4" />
            <span>Assets</span>
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center space-x-2">
            <History className="w-4 h-4" />
            <span>Transactions</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="space-y-4">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="flex items-center space-x-2">
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </Button>
          </div>

          {/* Assets List */}
          <Card>
            <CardHeader>
              <CardTitle>Your Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                {filteredAssets.map((asset, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center justify-between p-3 sm:p-4 rounded-lg transition-all cursor-pointer ${
                      selectedAsset === asset.symbol 
                        ? 'bg-purple-50 border-2 border-purple-200' 
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => setSelectedAsset(selectedAsset === asset.symbol ? null : asset.symbol)}
                  >
                    <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-orange-400 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-base sm:text-lg">{asset.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{asset.name}</h3>
                        <div className="flex items-center space-x-2 text-xs sm:text-sm">
                          <p className="text-gray-600">{asset.symbol}</p>
                          <span className="text-gray-400 hidden sm:inline">•</span>
                          <p className="text-gray-600 hidden sm:inline">{asset.price}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <div>
                          <p className="font-semibold text-sm sm:text-base">
                            {hideBalances ? '•••••' : asset.balance}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-600">
                            {hideBalances ? '•••••••' : asset.value}
                          </p>
                        </div>
                        <div className={`flex items-center space-x-1 ${
                          asset.positive ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {asset.positive ? (
                            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                          ) : (
                            <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />
                          )}
                          <span className="text-xs sm:text-sm font-medium">{asset.change}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <CardTitle>Transaction History</CardTitle>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        transaction.type === 'receive' 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-blue-100 text-blue-600'
                      }`}>
                        {transaction.type === 'receive' ? (
                          <ArrowDownLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                        ) : (
                          <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                          {transaction.type === 'receive' ? 'Received' : 'Sent'} {transaction.asset}
                        </p>
                        <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                          <span>{transaction.time}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="font-mono hidden sm:inline">{transaction.hash}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToClipboard(transaction.hash)}
                            className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 hover:text-gray-600 hidden sm:inline-flex"
                          >
                            <Copy className="w-2 h-2 sm:w-3 sm:h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-sm sm:text-base">
                        {transaction.type === 'receive' ? '+' : '-'}{transaction.amount} {transaction.asset}
                      </p>
                      <div className="flex items-center space-x-2 justify-end">
                        <p className="text-xs sm:text-sm text-gray-600">{transaction.value}</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          transaction.status === 'completed' 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-yellow-100 text-yellow-600'
                        }`}>
                          {transaction.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}