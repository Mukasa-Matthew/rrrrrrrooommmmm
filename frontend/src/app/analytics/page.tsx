'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layout } from '@/components/layout/Layout';
import { 
  Building2, 
  Users, 
  TrendingUp,
  MapPin,
  BarChart3,
  PieChart
} from 'lucide-react';

interface OverviewStats {
  total_hostels: number;
  total_students: number;
  total_admins: number;
  total_rooms: number;
  available_rooms: number;
  occupied_rooms: number;
  overall_occupancy_rate: number;
}

interface OccupancyData {
  id: number;
  name: string;
  total_rooms: number;
  available_rooms: number;
  occupied_rooms: number;
  occupancy_rate: number;
  status: string;
}

interface RegionStats {
  region: string;
  hostel_count: number;
  total_rooms: number;
  available_rooms: number;
  occupied_rooms: number;
  avg_occupancy_rate: number;
}

export default function AnalyticsPage() {
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [occupancyData, setOccupancyData] = useState<OccupancyData[]>([]);
  const [regionStats, setRegionStats] = useState<RegionStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      const [overviewRes, occupancyRes, regionRes] = await Promise.all([
        fetch('http://localhost:5000/api/analytics/overview', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }),
        fetch('http://localhost:5000/api/analytics/occupancy/rates', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }),
        fetch('http://localhost:5000/api/analytics/regions/stats', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        })
      ]);

      const [overviewData, occupancyData, regionData] = await Promise.all([
        overviewRes.json(),
        occupancyRes.json(),
        regionRes.json()
      ]);

      if (overviewData.success) setOverviewStats(overviewData.data);
      if (occupancyData.success) setOccupancyData(occupancyData.data);
      if (regionData.success) setRegionStats(regionData.data);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
            <p className="mt-2 text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">Platform insights and performance metrics</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Overview Stats */}
        {overviewStats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Hostels</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <a href="/hostels" className="block">
                  <div className="text-2xl font-bold hover:underline">{overviewStats.total_hostels}</div>
                  <p className="text-xs text-muted-foreground">Onboarded hostels</p>
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overviewStats.total_students}</div>
                <p className="text-xs text-muted-foreground">Across platform</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Rooms</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overviewStats.total_rooms}</div>
                <p className="text-xs text-muted-foreground">Available capacity</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overall Occupancy</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getOccupancyColor(overviewStats.overall_occupancy_rate)}`}>
                  {overviewStats.overall_occupancy_rate}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {overviewStats.occupied_rooms} of {overviewStats.total_rooms} rooms
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Occupancy Rates by Hostel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Occupancy Rates by Hostel</span>
              </CardTitle>
              <CardDescription>
                Current occupancy rates for each hostel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {occupancyData.map((hostel) => (
                  <div key={hostel.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{hostel.name}</h4>
                        <Badge className={getStatusColor(hostel.status)}>
                          {hostel.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {hostel.occupied_rooms} of {hostel.total_rooms} rooms occupied
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${getOccupancyColor(hostel.occupancy_rate)}`}>
                        {hostel.occupancy_rate}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Region-wise Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Region-wise Growth</span>
              </CardTitle>
              <CardDescription>
                Hostel distribution and adoption by region
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {regionStats.map((region) => (
                  <div key={region.region} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{region.region}</h4>
                      <p className="text-sm text-gray-600">
                        {region.hostel_count} hostels • {region.total_rooms} rooms
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${getOccupancyColor(region.avg_occupancy_rate)}`}>
                        {region.avg_occupancy_rate}%
                      </div>
                      <p className="text-xs text-gray-500">avg occupancy</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
