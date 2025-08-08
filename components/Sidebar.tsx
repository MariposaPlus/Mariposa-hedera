"use client";

import { useState } from 'react';
import { 
  Home, 
  Wallet, 
  TrendingUp, 
  Bot, 
  Settings, 
  User, 
  ChevronLeft, 
  ChevronRight,
  CreditCard,
  Activity,
  PieChart,
  Badge,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  currentPage: string;
  onPageChange: (page: string) => void;
  agentCount: number;
  mobileMenuOpen: boolean;
  onMobileMenuToggle: () => void;
}

export default function Sidebar({ 
  collapsed, 
  onToggle, 
  currentPage, 
  onPageChange, 
  agentCount,
  mobileMenuOpen,
  onMobileMenuToggle
}: SidebarProps) {
  const navigation = [
    { name: 'Dashboard', key: 'dashboard', icon: Home },
    { name: 'Wallet', key: 'wallet', icon: Wallet },
    { name: 'Trading', key: 'trading', icon: TrendingUp },
    { name: 'Cards', key: 'cards', icon: CreditCard },
    { name: 'Analytics', key: 'analytics', icon: PieChart },
    { name: 'Activity', key: 'activity', icon: Activity },
    { name: 'Agents', key: 'agents', icon: Bot, badge: agentCount },
    { name: 'Profile', key: 'profile', icon: User },
    { name: 'Settings', key: 'settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={onMobileMenuToggle}
        className="fixed top-4 left-4 z-50 p-2 bg-gray-900 text-white rounded-md md:hidden"
      >
        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <div className={cn(
        "flex flex-col h-full bg-gradient-to-b from-gray-900 to-gray-800 border-r border-gray-700 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          {!collapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">CryptoVault</span>
            </div>
          )}
          {/* Desktop toggle button */}
          <button
            onClick={onToggle}
            className="p-1 rounded-md hover:bg-gray-700 transition-colors hidden md:block"
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-2">
          {navigation.map((item) => (
            <button
              key={item.name}
              onClick={() => onPageChange(item.key)}
              className={cn(
                "flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group",
                currentPage === item.key
                  ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg"
                  : "text-gray-300 hover:text-white hover:bg-gray-700"
              )}
            >
              <div className="flex items-center">
                <item.icon className={cn(
                  "flex-shrink-0 w-5 h-5",
                  collapsed ? "mx-auto" : "mr-3"
                )} />
                {!collapsed && <span>{item.name}</span>}
              </div>
              {!collapsed && item.badge && item.badge > 0 && (
                <span className="bg-purple-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="p-4 border-t border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  John Doe
                </p>
                <p className="text-xs text-gray-400 truncate">
                  john@example.com
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}