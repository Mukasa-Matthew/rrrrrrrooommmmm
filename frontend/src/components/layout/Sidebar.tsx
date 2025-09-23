'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Building2, 
  Plus,
  BarChart3,
  GraduationCap,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      // The logout function in AuthContext will handle the redirect
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getNavigationItems = () => {
    if (user?.role === 'super_admin') {
      return [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Create Hostel', href: '/hostels/create', icon: Plus },
        { name: 'View Hostels', href: '/hostels', icon: Building2 },
        { name: 'Universities', href: '/universities', icon: GraduationCap },
        { name: 'Analytics', href: '/analytics', icon: BarChart3 },
      ];
    }

    if (user?.role === 'hostel_admin') {
      return [
        { name: 'Dashboard', href: '/hostel-admin/dashboard', icon: LayoutDashboard },
        { name: 'Inventory', href: '/hostel-admin/inventory', icon: Building2 },
        { name: 'Rooms', href: '/hostel-admin/rooms', icon: Building2 },
        { name: 'Custodians', href: '/hostel-admin/custodians', icon: Building2 },
        { name: 'Outstanding Balances', href: '/hostel-admin/outstanding', icon: BarChart3 },
        { name: 'Financial Reports', href: '/hostel-admin/reports', icon: BarChart3 },
        { name: 'Change Password', href: '/hostel-admin/change-password', icon: LogOut },
      ];
    }

    if ((user as any)?.role === 'custodian') {
      return [
        { name: 'Dashboard', href: '/custodian/dashboard', icon: LayoutDashboard },
        { name: 'Students', href: '/custodian/students', icon: GraduationCap },
        { name: 'Inventory', href: '/custodian/inventory', icon: Building2 },
        { name: 'Expenses', href: '/custodian/expenses', icon: BarChart3 },
        { name: 'Transactions', href: '/custodian/transactions', icon: BarChart3 },
        { name: 'Outstanding Balances', href: '/custodian/outstanding', icon: BarChart3 },
      ];
    }

    return [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ];
  };

  const navigationItems = getNavigationItems();

  const getRoleLabel = () => {
    switch (user?.role) {
      case 'super_admin':
        return 'Super Admin';
      case 'hostel_admin':
        return 'Hostel Admin';
      case 'tenant':
        return 'Tenant';
      case 'user':
        return 'User';
      default:
        return '';
    }
  };

  return (
    <aside className={cn("w-64 bg-gray-50 border-r min-h-screen flex flex-col", className)}>
      {/* Logo/Header */}
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold text-gray-900">LTS Portal</h2>
        {getRoleLabel() && (
          <p className="text-sm text-gray-600">{getRoleLabel()}</p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.name}
              variant="ghost"
              className="w-full justify-start text-left"
              asChild
            >
              <a href={item.href} className="flex items-center space-x-3">
                <Icon className="h-4 w-4" />
                <span>{item.name}</span>
              </a>
            </Button>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-purple-800">
              {user?.name?.split(' ').map(n => n[0]).join('') || 'MM'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.email || 'admin@example.com'}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </aside>
  );
};
