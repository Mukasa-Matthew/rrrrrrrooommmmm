'use client';

import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Building2, 
  Users, 
  Calendar, 
  DollarSign, 
  RefreshCw,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  CreditCard,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { API_CONFIG, getAuthHeaders } from '@/config/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Hostel {
  id: number;
  name: string;
  address?: string;
  status?: string;
  created_at: string;
  total_rooms: number;
  available_rooms: number;
  contact_phone?: string;
  contact_email?: string;
}

interface HostelWithSubscription extends Hostel {
  subscription?: {
    id: number;
    plan_name: string;
    status: 'active' | 'expired' | 'cancelled';
    start_date: string;
    end_date: string;
    amount_paid: number;
    total_price: number;
  };
  admin?: {
    name: string;
    email: string;
  };
  students_count?: number;
}

export default function HostelsPage() {
  const [hostels, setHostels] = useState<HostelWithSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState<'name' | 'created_at' | 'total_rooms'>('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'cancelled'>('all');
  const [selectedHostel, setSelectedHostel] = useState<HostelWithSubscription | null>(null);
  const [showRenewModal, setShowRenewModal] = useState(false);

  useEffect(() => {
    fetchHostels();
  }, [page, limit, sort, order, searchQuery, statusFilter]);

  const fetchHostels = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ 
        page: String(page), 
        limit: String(limit), 
        sort, 
        order,
        search: searchQuery,
        status: statusFilter !== 'all' ? statusFilter : ''
      });
      
      const res = await fetch(`${API_CONFIG.ENDPOINTS.HOSTELS.LIST}?${params.toString()}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to load hostels');
      }
      
      setHostels(data.data || []);
      setTotal(Number(data.total || 0));
    } catch (e: any) {
      setError(e?.message || 'Failed to load hostels');
    } finally {
      setLoading(false);
    }
  };

  const handleRenewSubscription = async (hostelId: number) => {
    try {
      const response = await fetch(`${API_CONFIG.ENDPOINTS.SUBSCRIPTION_PLANS.SUBSCRIBE_HOSTEL}/${hostelId}/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          plan_id: selectedHostel?.subscription?.id || 1, // Default to first plan
          payment_method: 'cash',
          payment_reference: `RENEWAL-${hostelId}-${Date.now()}`
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess('Subscription renewed successfully!');
        setShowRenewModal(false);
        setSelectedHostel(null);
        fetchHostels(); // Refresh the list
      } else {
        setError(data.message || 'Failed to renew subscription');
      }
    } catch (err) {
      setError('Failed to renew subscription');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case 'expired':
        return <Badge className="bg-red-100 text-red-800"><AlertTriangle className="h-3 w-3 mr-1" />Expired</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-800">Cancelled</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-800">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(price);
  };

  if (loading && hostels.length === 0) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/4"></div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-64 bg-slate-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Hostels Management</h1>
            <p className="text-slate-600 mt-2">Manage all hostels and their subscriptions</p>
          </div>
          <Button 
            onClick={() => window.location.href = '/hostels/create'}
            className="gradient-bg hover:opacity-90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Hostel
          </Button>
        </div>

        {/* Search and Filters */}
        <Card className="card-hover border-0 shadow-lg bg-white">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    placeholder="Search hostels by name, address, or admin..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {/* Filters */}
              <div className="flex gap-3">
                <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={sort} onValueChange={(value: any) => setSort(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="created_at">Created Date</SelectItem>
                    <SelectItem value="total_rooms">Total Rooms</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')}
                  className="px-3"
                >
                  {order === 'asc' ? '↑' : '↓'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={fetchHostels}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Hostels Grid */}
        {hostels.length === 0 ? (
          <Card className="card-hover border-0 shadow-lg bg-white">
            <CardContent className="text-center py-12">
              <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Hostels Found</h3>
              <p className="text-slate-600 mb-4">
                {searchQuery ? 'No hostels match your search criteria.' : 'Get started by creating your first hostel.'}
              </p>
              <Button 
                onClick={() => window.location.href = '/hostels/create'}
                className="gradient-bg hover:opacity-90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Hostel
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {hostels.map((hostel) => (
              <Card key={hostel.id} className="card-hover border-0 shadow-lg bg-white">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-slate-900 mb-1">
                        {hostel.name}
                      </CardTitle>
                      {hostel.address && (
                        <p className="text-sm text-slate-600 line-clamp-2">{hostel.address}</p>
                      )}
                    </div>
                    {getStatusBadge(hostel.subscription?.status || hostel.status || 'active')}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Hostel Stats */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">Rooms:</span>
                      <span className="font-medium">{hostel.total_rooms}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">Students:</span>
                      <span className="font-medium">{hostel.students_count || 0}</span>
                    </div>
                  </div>

                  {/* Subscription Info */}
                  {hostel.subscription && (
                    <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">Subscription</span>
                        <Badge variant="outline" className="text-xs">
                          {hostel.subscription.plan_name}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-600 space-y-1">
                        <div className="flex justify-between">
                          <span>Start:</span>
                          <span>{formatDate(hostel.subscription.start_date)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>End:</span>
                          <span>{formatDate(hostel.subscription.end_date)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Paid:</span>
                          <span className="font-medium">{formatPrice(hostel.subscription.amount_paid)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Admin Info */}
                  {hostel.admin && (
                    <div className="text-xs text-slate-600">
                      <div className="font-medium text-slate-700 mb-1">Admin</div>
                      <div>{hostel.admin.name}</div>
                      <div>{hostel.admin.email}</div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = `/hostels/${hostel.id}`}
                      className="flex-1"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View Details
                    </Button>
                    
                    {hostel.subscription?.status === 'expired' && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedHostel(hostel);
                          setShowRenewModal(true);
                        }}
                        className="gradient-bg hover:opacity-90"
                      >
                        <CreditCard className="h-3 w-3 mr-1" />
                        Renew
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <Card className="card-hover border-0 shadow-lg bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} hostels
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={(page * limit) >= total}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
