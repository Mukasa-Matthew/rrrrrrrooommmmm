'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Layout } from '@/components/layout/Layout';
import { 
  Building2, 
  Users, 
  Plus,
  Settings,
  BarChart3,
  UserPlus,
  GraduationCap,
  TrendingUp,
  MapPin
} from 'lucide-react';
import { API_CONFIG, getAuthHeaders } from '@/config/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';

interface PlatformStats {
  total_universities: number;
  total_hostels: number;
  total_students: number;
  total_hostel_admins: number;
  total_university_admins: number;
  total_rooms: number;
  available_rooms: number;
  occupied_rooms: number;
  overall_occupancy_rate: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expired, setExpired] = useState<any[]>([]);
  const [expLoading, setExpLoading] = useState(false);
  const [expError, setExpError] = useState('');

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good morning', emoji: '☀️' };
    if (hour < 17) return { text: 'Good afternoon', emoji: '🌤️' };
    return { text: 'Good evening', emoji: '🌙' };
  };

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchPlatformStats();
      fetchExpired();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchPlatformStats = async () => {
    try {
      const response = await fetch(API_CONFIG.ENDPOINTS.ANALYTICS.PLATFORM_OVERVIEW, { headers: getAuthHeaders() });
      const data = await response.json();
      
      if (data.success) {
        setPlatformStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch platform stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExpired = async () => {
    try {
      setExpError('');
      setExpLoading(true);
      const res = await fetch(API_CONFIG.ENDPOINTS.SUBSCRIPTION_PLANS.EXPIRED, { headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load expired');
      setExpired(data.expiredSubscriptions || data.data || []);
    } catch (e: any) {
      setExpError(e?.message || 'Failed to load expired');
    } finally {
      setExpLoading(false);
    }
  };

  const handleRenew = async (hostelId: number, planId: number) => {
    try {
      const res = await fetch(`${API_CONFIG.ENDPOINTS.SUBSCRIPTION_PLANS.RENEW_HOSTEL}/${hostelId}/renew`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ plan_id: planId, payment_method: 'manual' })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to renew');
      await fetchExpired();
    } catch (e) {
      console.error(e);
    }
  };


  const getWelcomeMessage = () => {
    switch (user?.role) {
      case 'super_admin':
        return 'Super Admin Dashboard';
      case 'hostel_admin':
        return 'Hostel Admin Dashboard';
      case 'tenant':
        return 'Tenant Dashboard';
      case 'user':
        return 'User Dashboard';
      default:
        return 'Dashboard';
    }
  };

  const getQuickActions = () => {
    if (user?.role === 'super_admin') {
      return [
        { name: 'Create New Hostel', href: '/hostels/create', icon: Plus, description: 'Add a new hostel with admin' },
        { name: 'View Hostels', href: '/hostels', icon: Building2, description: 'View all hostels' },
        { name: 'Manage Universities', href: '/universities', icon: GraduationCap, description: 'Manage universities and regions' },
        { name: 'View Analytics', href: '/analytics', icon: BarChart3, description: 'Platform analytics and insights' },
      ];
    }

    return [];
  };

  const quickActions = getQuickActions();

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">{getWelcomeMessage()}</h1>
            <p className="text-slate-600 mt-2 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-base sm:text-lg">
              <span className="text-2xl sm:text-3xl" aria-hidden>
                {getTimeGreeting().emoji}
              </span>
              <span>
                {getTimeGreeting().text}, <span className="font-semibold text-slate-800">{user?.name?.split(' ')[0] || 'Super Admin'}</span>! Here&apos;s what&apos;s happening today.
              </span>
            </p>
          </div>
          {user?.role === 'super_admin' && (
            <Badge className="bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-800 border-indigo-200 px-4 py-2 text-sm font-semibold">
              SUPER ADMIN
            </Badge>
          )}
          {user?.role === 'hostel_admin' && (
            <Badge className="bg-gradient-to-r from-slate-100 to-slate-200 text-slate-800 border-slate-200 px-4 py-2 text-sm font-semibold">
              HOSTEL ADMIN
            </Badge>
          )}
        </div>

        {/* Platform Overview Stats for Super Admin */}
        {user?.role === 'super_admin' && platformStats && (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="card-hover border-0 shadow-lg bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700">Universities</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-indigo-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{platformStats.total_universities}</div>
                <p className="text-sm text-slate-500 mt-1">Onboarded universities</p>
              </CardContent>
            </Card>

            <Card className="card-hover border-0 shadow-lg bg-white">
              <a href="/hostels" className="block group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-semibold text-slate-700">Hostels</CardTitle>
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-slate-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{platformStats.total_hostels}</div>
                  <p className="text-sm text-slate-500 mt-1">Across all universities</p>
                </CardContent>
              </a>
            </Card>

            <Card className="card-hover border-0 shadow-lg bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700">Students</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center">
                  <Users className="h-5 w-5 text-indigo-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{platformStats.total_students}</div>
                <p className="text-sm text-slate-500 mt-1">Total students</p>
              </CardContent>
            </Card>

            <Card className="card-hover border-0 shadow-lg bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700">Occupancy Rate</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-slate-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{platformStats.overall_occupancy_rate}%</div>
                <p className="text-sm text-slate-500 mt-1">
                  {platformStats.occupied_rooms} of {platformStats.total_rooms} rooms
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {user?.role === 'super_admin' && (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
            <Card className="card-hover border-0 shadow-lg bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-slate-900">Quick Actions</CardTitle>
                <CardDescription className="text-slate-600">
                  Available actions for Super Admin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Button key={action.name} variant="outline" className="w-full justify-start h-auto p-4 border-slate-200 hover:bg-slate-50 hover:border-indigo-300 transition-all" asChild>
                        <a href={action.href} className="flex items-start space-x-4">
                          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center flex-shrink-0">
                            <Icon className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div className="text-left">
                            <div className="font-semibold text-slate-900">{action.name}</div>
                            <div className="text-sm text-slate-500 mt-1">{action.description}</div>
                          </div>
                        </a>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover border-0 shadow-lg bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-3 text-xl font-bold text-slate-900">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-slate-600" />
                  </div>
                  <span>Platform Overview</span>
                </CardTitle>
                <CardDescription className="text-slate-600">
                  Multi-tenant platform statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-sm font-semibold text-slate-700">Total Universities</span>
                    <span className="text-2xl font-bold text-slate-900">{platformStats?.total_universities || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-sm font-semibold text-slate-700">Total Hostels</span>
                    <a href="/hostels" className="text-2xl font-bold text-slate-900 hover:text-indigo-600 transition-colors">{platformStats?.total_hostels || 0}</a>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-sm font-semibold text-slate-700">Total Students</span>
                    <span className="text-2xl font-bold text-slate-900">{platformStats?.total_students || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm font-semibold text-slate-700">Overall Occupancy</span>
                    <span className="text-2xl font-bold text-slate-900">{platformStats?.overall_occupancy_rate || 0}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {user?.role === 'super_admin' && (
          <div className="grid gap-4 sm:gap-6 grid-cols-1">
            <Card className="card-hover border-0 shadow-lg bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-slate-900">Expired Subscriptions</CardTitle>
                <CardDescription className="text-slate-600">Renew hostels whose subscriptions have expired</CardDescription>
              </CardHeader>
              <CardContent>
                {expError && (
                  <Alert variant="destructive"><AlertDescription>{expError}</AlertDescription></Alert>
                )}
                {expLoading ? (
                  <div className="text-sm text-slate-600">Loading...</div>
                ) : expired.length === 0 ? (
                  <div className="text-sm text-slate-600">No expired subscriptions</div>
                ) : (
                  <div className="space-y-3">
                    {expired.map((row: any) => (
                      <div key={row.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                        <div className="text-sm">
                          <div className="font-semibold text-slate-900">{row.hostel_name || row.hostel_name?.name || row.hostel_name || row.hostel || 'Hostel #' + row.hostel_id}</div>
                          <div className="text-slate-600">Plan: {row.plan_name} • Ended: {new Date(row.end_date).toLocaleDateString()}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => handleRenew(row.hostel_id, row.plan_id)}>Renew</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
