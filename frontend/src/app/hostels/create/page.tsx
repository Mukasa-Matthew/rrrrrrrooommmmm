'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Layout } from '@/components/layout/Layout';
import { Loader2, Building2, UserPlus, MapPin, GraduationCap } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface University {
  id: number;
  name: string;
  code: string;
  region_id: number;
  region_name: string;
}

interface Region {
  id: number;
  name: string;
  country: string;
}

export default function CreateHostelPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [universities, setUniversities] = useState<University[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const router = useRouter();

  // Hostel form data
  const [hostelData, setHostelData] = useState({
    name: '',
    address: '',
    description: '',
    total_rooms: '',
    available_rooms: '',
    contact_phone: '',
    contact_email: '',
    status: 'active' as const,
    university_id: '',
    region_id: ''
  });

  // Admin form data
  const [adminData, setAdminData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    fetchUniversitiesAndRegions();
  }, []);

  const fetchUniversitiesAndRegions = async () => {
    try {
      const [universitiesRes, regionsRes] = await Promise.all([
        fetch('http://localhost:5000/api/universities', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }),
        fetch('http://localhost:5000/api/universities/regions/list', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        })
      ]);

      const [universitiesData, regionsData] = await Promise.all([
        universitiesRes.json(),
        regionsRes.json()
      ]);

      if (universitiesData.success) {
        setUniversities(universitiesData.data);
      }
      if (regionsData.success) {
        setRegions(regionsData.data);
      }
    } catch (error) {
      console.error('Failed to fetch universities and regions:', error);
    }
  };

  const handleHostelChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setHostelData(prev => ({ ...prev, [name]: value }));
  };

  const handleAdminChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAdminData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!hostelData.name || !hostelData.address || !hostelData.total_rooms) {
      setError('Please fill in all required hostel fields');
      return;
    }

    if (!adminData.name || !adminData.email || !adminData.phone || !adminData.address) {
      setError('Please fill in all required admin fields');
      return;
    }


    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/hostels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          ...hostelData,
          total_rooms: parseInt(hostelData.total_rooms),
          available_rooms: parseInt(hostelData.available_rooms) || parseInt(hostelData.total_rooms),
          admin_name: adminData.name,
          admin_email: adminData.email,
          admin_phone: adminData.phone,
          admin_address: adminData.address
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to create hostel');
      }

      setSuccess('Hostel and admin created successfully!');
      
      // Redirect to hostels list after 2 seconds
      setTimeout(() => {
        router.push('/hostels');
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create hostel');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Hostel</h1>
          <p className="text-gray-600 mt-2">Create a new hostel and assign an administrator</p>
        </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Hostel Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>Hostel Information</span>
            </CardTitle>
            <CardDescription>
              Enter the details for the new hostel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Hostel Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={hostelData.name}
                  onChange={handleHostelChange}
                  placeholder="Enter hostel name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="total_rooms">Total Rooms *</Label>
                <Input
                  id="total_rooms"
                  name="total_rooms"
                  type="number"
                  value={hostelData.total_rooms}
                  onChange={handleHostelChange}
                  placeholder="Enter total rooms"
                  min="1"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="university_id">University *</Label>
                <Select
                  value={hostelData.university_id || undefined}
                  onValueChange={(value) => setHostelData(prev => ({ ...prev, university_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select university" />
                  </SelectTrigger>
                  <SelectContent>
                    {universities.map((university) => (
                      <SelectItem key={university.id} value={university.id.toString()}>
                        {university.name} ({university.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="region_id">Region *</Label>
                <Select
                  value={hostelData.region_id || undefined}
                  onValueChange={(value) => setHostelData(prev => ({ ...prev, region_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map((region) => (
                      <SelectItem key={region.id} value={region.id.toString()}>
                        {region.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>


            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Textarea
                id="address"
                name="address"
                value={hostelData.address}
                onChange={handleHostelChange}
                placeholder="Enter full address"
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={hostelData.description}
                onChange={handleHostelChange}
                placeholder="Enter hostel description (optional)"
                rows={3}
              />
            </div>


            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="available_rooms">Available Rooms</Label>
                <Input
                  id="available_rooms"
                  name="available_rooms"
                  type="number"
                  value={hostelData.available_rooms}
                  onChange={handleHostelChange}
                  placeholder="Available rooms"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  name="contact_phone"
                  value={hostelData.contact_phone}
                  onChange={handleHostelChange}
                  placeholder="Contact phone"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  name="contact_email"
                  type="email"
                  value={hostelData.contact_email}
                  onChange={handleHostelChange}
                  placeholder="Contact email"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserPlus className="h-5 w-5" />
              <span>Hostel Administrator</span>
            </CardTitle>
            <CardDescription>
              Create an administrator account for this hostel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="admin_name">Admin Name *</Label>
                <Input
                  id="admin_name"
                  name="name"
                  value={adminData.name}
                  onChange={handleAdminChange}
                  placeholder="Enter admin name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin_email">Admin Email *</Label>
                <Input
                  id="admin_email"
                  name="email"
                  type="email"
                  value={adminData.email}
                  onChange={handleAdminChange}
                  placeholder="Enter admin email"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="admin_phone">Phone Number *</Label>
                <Input
                  id="admin_phone"
                  name="phone"
                  type="tel"
                  value={adminData.phone}
                  onChange={handleAdminChange}
                  placeholder="Enter phone number"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin_address">Address *</Label>
                <Input
                  id="admin_address"
                  name="address"
                  type="text"
                  value={adminData.address}
                  onChange={handleAdminChange}
                  placeholder="Enter address"
                  required
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-white text-xs">i</span>
                </div>
                <div>
                  <h4 className="font-medium text-blue-900">Temporary Credentials</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    The hostel administrator will receive temporary login credentials via email. 
                    They will be required to change their password on first login.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error/Success Messages */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/hostels')}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Hostel & Admin
          </Button>
        </div>
      </form>
      </div>
    </Layout>
  );
}
