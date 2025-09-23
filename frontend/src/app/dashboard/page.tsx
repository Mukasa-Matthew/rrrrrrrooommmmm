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

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchPlatformStats();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchPlatformStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/multi-tenant/platform/overview', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{getWelcomeMessage()}</h1>
            <p className="text-gray-600">
              Welcome back, {user?.name || 'Super Admin'}! Here&apos;s what&apos;s happening today.
            </p>
          </div>
          {user?.role === 'super_admin' && (
            <Badge className="bg-purple-100 text-purple-800">
              SUPER ADMIN
            </Badge>
          )}
          {user?.role === 'hostel_admin' && (
            <Badge className="bg-blue-100 text-blue-800">
              HOSTEL ADMIN
            </Badge>
          )}
        </div>

        {/* Platform Overview Stats for Super Admin */}
        {user?.role === 'super_admin' && platformStats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Universities</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{platformStats.total_universities}</div>
                <p className="text-xs text-muted-foreground">Onboarded universities</p>
              </CardContent>
            </Card>

            <Card>
              <a href="/hostels" className="block group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Hostels</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold group-hover:underline">{platformStats.total_hostels}</div>
                  <p className="text-xs text-muted-foreground">Across all universities</p>
                </CardContent>
              </a>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{platformStats.total_students}</div>
                <p className="text-xs text-muted-foreground">Total students</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{platformStats.overall_occupancy_rate}%</div>
                <p className="text-xs text-muted-foreground">
                  {platformStats.occupied_rooms} of {platformStats.total_rooms} rooms
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {user?.role === 'super_admin' && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Available actions for Super Admin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Button key={action.name} variant="outline" className="w-full justify-start h-auto p-4" asChild>
                        <a href={action.href} className="flex items-start space-x-3">
                          <Icon className="h-4 w-4 mt-0.5" />
                          <div className="text-left">
                            <div className="font-medium">{action.name}</div>
                            <div className="text-xs text-muted-foreground">{action.description}</div>
                          </div>
                        </a>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5" />
                  <span>Platform Overview</span>
                </CardTitle>
                <CardDescription>
                  Multi-tenant platform statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Universities</span>
                    <span className="text-lg font-bold">{platformStats?.total_universities || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Hostels</span>
                    <a href="/hostels" className="text-lg font-bold hover:underline">{platformStats?.total_hostels || 0}</a>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Students</span>
                    <span className="text-lg font-bold">{platformStats?.total_students || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Overall Occupancy</span>
                    <span className="text-lg font-bold">{platformStats?.overall_occupancy_rate || 0}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
