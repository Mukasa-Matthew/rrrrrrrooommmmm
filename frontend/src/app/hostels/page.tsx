'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Layout } from '@/components/layout/Layout';
import { 
  Building2, 
  Plus, 
  Users, 
  MapPin, 
  Phone, 
  Mail,
  MoreHorizontal,
  Edit,
  Trash2,
  Mail as MailIcon
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Hostel {
  id: number;
  name: string;
  address: string;
  description?: string;
  total_rooms: number;
  available_rooms: number;
  contact_phone?: string;
  contact_email?: string;
  status: 'active' | 'inactive' | 'maintenance' | 'suspended';
  created_at: string;
  updated_at: string;
}

export default function HostelsPage() {
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchHostels();
  }, []);

  const fetchHostels = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/hostels', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch hostels');
      }

      setHostels(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch hostels');
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

  const handleStatusChange = async (hostelId: number, newStatus: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/hostels/${hostelId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to update hostel status');
      }

      // Refresh the hostels list
      fetchHostels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update hostel status');
    }
  };

  const handleDeleteHostel = async (hostelId: number) => {
    if (!confirm('Are you sure you want to delete this hostel? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/hostels/${hostelId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete hostel');
      }

      // Refresh the hostels list
      fetchHostels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete hostel');
    }
  };

  const handleResendCredentials = async (hostelId: number) => {
    if (!confirm('Are you sure you want to resend credentials? This will generate a new temporary password for the hostel admin.')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/hostels/${hostelId}/resend-credentials`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to resend credentials');
      }

      // Show success message
      alert(`Credentials sent successfully to ${data.data.admin_email}`);
      
      // In development, also show the new password
      if (data.data.new_password) {
        console.log('New temporary password:', data.data.new_password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend credentials');
    }
  };

  const getOccupancyRate = (total: number, available: number) => {
    const occupied = total - available;
    return Math.round((occupied / total) * 100);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading hostels...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Hostels Management</h1>
            <p className="text-gray-600 mt-2">Manage all hostels in the system</p>
          </div>
          <Button onClick={() => router.push('/hostels/create')}>
            <Plus className="h-4 w-4 mr-2" />
            Create New Hostel
          </Button>
        </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {hostels.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hostels found</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first hostel</p>
            <Button onClick={() => router.push('/hostels/create')}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Hostel
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {hostels.map((hostel) => (
            <Card key={hostel.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{hostel.name}</CardTitle>
                    <CardDescription className="mt-1">
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-3 w-3 mr-1" />
                        {hostel.address}
                      </div>
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(hostel.status)}>
                      {hostel.status.toUpperCase()}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleResendCredentials(hostel.id)}>
                          <MailIcon className="h-4 w-4 mr-2" />
                          Resend Credentials
                        </DropdownMenuItem>
                        {hostel.status === 'active' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(hostel.id, 'suspended')}>
                            <span className="text-orange-600">Suspend</span>
                          </DropdownMenuItem>
                        )}
                        {hostel.status === 'active' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(hostel.id, 'inactive')}>
                            <span className="text-red-600">Deactivate</span>
                          </DropdownMenuItem>
                        )}
                        {hostel.status === 'suspended' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(hostel.id, 'active')}>
                            <span className="text-green-600">Reactivate</span>
                          </DropdownMenuItem>
                        )}
                        {hostel.status === 'inactive' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(hostel.id, 'active')}>
                            <span className="text-green-600">Activate</span>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => handleDeleteHostel(hostel.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {hostel.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {hostel.description}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{hostel.total_rooms}</div>
                    <div className="text-xs text-gray-600">Total Rooms</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{hostel.available_rooms}</div>
                    <div className="text-xs text-gray-600">Available</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Occupancy Rate</span>
                    <span className="font-medium">
                      {getOccupancyRate(hostel.total_rooms, hostel.available_rooms)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ 
                        width: `${getOccupancyRate(hostel.total_rooms, hostel.available_rooms)}%` 
                      }}
                    ></div>
                  </div>
                </div>

                {(hostel.contact_phone || hostel.contact_email) && (
                  <div className="space-y-1 pt-2 border-t">
                    {hostel.contact_phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="h-3 w-3 mr-2" />
                        {hostel.contact_phone}
                      </div>
                    )}
                    {hostel.contact_email && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="h-3 w-3 mr-2" />
                        {hostel.contact_email}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>
    </Layout>
  );
}
