'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Building2, 
  Users, 
  Bed,
  Settings,
  Bell,
  TrendingUp,
  Calendar,
  MapPin,
  Phone,
  Mail
} from 'lucide-react';

interface HostelStats {
  total_rooms: number;
  available_rooms: number;
  occupied_rooms: number;
  occupancy_rate: number;
  total_students: number;
  hostel_name?: string;
  address?: string;
  university_name?: string;
  status?: string;
}

export default function HostelAdminDashboard() {
  const { user } = useAuth();
  const [hostelStats, setHostelStats] = useState<HostelStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'hostel_admin' && user.hostel_id) {
      fetchHostelStats();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchHostelStats = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/multi-tenant/hostel/${user?.hostel_id}/overview`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setHostelStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch hostel stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getOccupancyColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

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
            <h1 className="text-3xl font-bold text-gray-900">Hostel Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Welcome back, {user?.name}! Manage your hostel operations.
            </p>
          </div>
          <Badge className="bg-blue-100 text-blue-800">
            HOSTEL ADMIN
          </Badge>
        </div>

        {/* Hostel Overview Stats */}
        {hostelStats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Rooms</CardTitle>
                <Bed className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{hostelStats.total_rooms}</div>
                <p className="text-xs text-muted-foreground">Total capacity</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Rooms</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{hostelStats.available_rooms}</div>
                <p className="text-xs text-muted-foreground">Ready for booking</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Occupied Rooms</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{hostelStats.occupied_rooms}</div>
                <p className="text-xs text-muted-foreground">Currently occupied</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getOccupancyColor(hostelStats.occupancy_rate)}`}>
                  {hostelStats.occupancy_rate}%
                </div>
                <p className="text-xs text-muted-foreground">Current occupancy</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Quick Actions</span>
              </CardTitle>
              <CardDescription>
                Common tasks for hostel management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Manage Students
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Bed className="h-4 w-4 mr-2" />
                Room Management
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Booking Calendar
              </Button>
            </CardContent>
          </Card>

          {/* Hostel Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="h-5 w-5" />
                <span>Hostel Information</span>
              </CardTitle>
              <CardDescription>
                Your hostel details and status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{hostelStats?.hostel_name || 'Loading...'}</span>
                </div>
                
                {hostelStats?.address && (
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                    <span className="text-sm text-gray-600">{hostelStats.address}</span>
                  </div>
                )}
                
                {hostelStats?.university_name && (
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{hostelStats.university_name}</span>
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <Badge className={hostelStats?.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {hostelStats?.status?.toUpperCase() || 'UNKNOWN'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest updates and notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Dashboard accessed</p>
                  <p className="text-xs text-gray-500">Just now</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Account created</p>
                  <p className="text-xs text-gray-500">Today</p>
                </div>
              </div>
              
              <div className="text-center py-4 text-gray-500">
                <p className="text-sm">More features coming soon...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
