'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Layout } from '@/components/layout/Layout';
import { 
  GraduationCap, 
  Plus, 
  MapPin,
  Phone,
  Mail,
  Globe,
  Edit,
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface University {
  id: number;
  name: string;
  code: string;
  region_id: number;
  region_name: string;
  address?: string;
  contact_phone?: string;
  contact_email?: string;
  website?: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
}

export default function UniversitiesPage() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUniversities();
  }, []);

  const fetchUniversities = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/universities', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setUniversities(data.data);
      } else {
        setError('Failed to fetch universities');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch universities');
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
      case 'suspended':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCreateUniversity = () => {
    // TODO: Implement create university modal/page
    console.log('Create university clicked');
  };

  const handleEditUniversity = (university: University) => {
    // TODO: Implement edit university modal/page
    console.log('Edit university:', university);
  };

  const handleDeleteUniversity = async (universityId: number) => {
    if (!confirm('Are you sure you want to delete this university?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/universities/${universityId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setUniversities(universities.filter(u => u.id !== universityId));
      } else {
        alert(data.message || 'Failed to delete university');
      }
    } catch (err) {
      alert('Failed to delete university');
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading universities...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Universities</h1>
            <p className="text-gray-600 mt-2">Manage universities and their regions</p>
          </div>
          <Button onClick={handleCreateUniversity} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Add University</span>
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {universities.map((university) => (
            <Card key={university.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <GraduationCap className="h-5 w-5 text-blue-600" />
                    <div>
                      <CardTitle className="text-lg">{university.name}</CardTitle>
                      <CardDescription className="flex items-center space-x-1">
                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          {university.code}
                        </span>
                        <Badge className={getStatusColor(university.status)}>
                          {university.status.toUpperCase()}
                        </Badge>
                      </CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditUniversity(university)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteUniversity(university.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{university.region_name}</span>
                  </div>
                  
                  {university.address && (
                    <div className="flex items-start space-x-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mt-0.5" />
                      <span>{university.address}</span>
                    </div>
                  )}
                  
                  {university.contact_phone && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>{university.contact_phone}</span>
                    </div>
                  )}
                  
                  {university.contact_email && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4" />
                      <span>{university.contact_email}</span>
                    </div>
                  )}
                  
                  {university.website && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Globe className="h-4 w-4" />
                      <a 
                        href={university.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {university.website}
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {universities.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No universities found</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first university.</p>
            <Button onClick={handleCreateUniversity} className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add University</span>
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
