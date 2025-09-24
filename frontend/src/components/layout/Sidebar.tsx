'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { API_CONFIG } from '@/config/api';
import { 
  LayoutDashboard, 
  Building2, 
  Plus,
  BarChart3,
  GraduationCap,
  LogOut,
  Menu,
  X,
  User,
  CreditCard
} from 'lucide-react';

interface SidebarProps {
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
        { name: 'Subscription Plans', href: '/subscription-plans', icon: CreditCard },
        { name: 'Universities', href: '/universities', icon: GraduationCap },
        { name: 'Analytics', href: '/analytics', icon: BarChart3 },
        { name: 'Profile', href: '/profile', icon: User },
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
        { name: 'Profile', href: '/profile', icon: User },
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
        { name: 'Profile', href: '/profile', icon: User },
      ];
    }

    return [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Profile', href: '/profile', icon: User },
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
    <>
      {/* Mobile Menu Button */}
      {isMobile && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-slate-200 md:hidden"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      )}

      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 w-64 h-screen bg-white border-r border-slate-200 flex flex-col shadow-xl z-50 transition-transform duration-300 ease-in-out",
        isMobile ? (isOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0",
        className
      )}>
        {/* Logo/Header */}
        <div className="p-6 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl gradient-bg flex items-center justify-center">
              <span className="text-lg font-bold text-white">R</span>
            </div>
            <div>
              <h2 className="text-xl font-bold brand-text">RooMio</h2>
              {getRoleLabel() && (
                <p className="text-sm text-slate-600">{getRoleLabel()}</p>
              )}
            </div>
          </div>
        </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.name}
              variant="ghost"
              className="w-full justify-start text-left h-11 hover:bg-slate-100 hover:text-slate-900 text-slate-700 transition-colors"
              asChild
            >
              <a href={item.href} className="flex items-center space-x-3">
                <Icon className="h-4 w-4" />
                <span className="font-medium">{item.name}</span>
              </a>
            </Button>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-slate-200 flex-shrink-0">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center">
            {user?.profile_picture ? (
              <img
                src={`${API_CONFIG.BASE_URL}${user.profile_picture}`}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center">
                <span className="text-sm font-bold text-indigo-700">
                  {user?.name?.split(' ').map(n => n[0]).join('') || 'MM'}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {user?.email || 'admin@example.com'}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full border-slate-200 hover:bg-slate-50 text-slate-700"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </aside>
    </>
  );
};
