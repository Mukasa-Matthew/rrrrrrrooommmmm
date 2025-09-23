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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [regions, setRegions] = useState<Array<{ id: number; name: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    code: '',
    region_id: '',
    address: '',
    contact_phone: '',
    contact_email: '',
    website: '',
    status: 'active'
  });
  const [editForm, setEditForm] = useState({
    id: 0,
    name: '',
    code: '',
    region_id: '',
    address: '',
    contact_phone: '',
    contact_email: '',
    website: '',
    status: 'active'
  });

  useEffect(() => {
    fetchUniversities();
    fetchRegions();
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

  const fetchRegions = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/universities/regions/list', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setRegions(data.data);
      }
    } catch (err) {
      // Silent failure; form will show empty list
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
    setCreateForm({
      name: '', code: '', region_id: '', address: '', contact_phone: '', contact_email: '', website: '', status: 'active'
    });
    setIsCreateOpen(true);
  };

  const handleEditUniversity = (university: University) => {
    setEditForm({
      id: university.id,
      name: university.name,
      code: university.code,
      region_id: String(university.region_id),
      address: university.address || '',
      contact_phone: university.contact_phone || '',
      contact_email: university.contact_email || '',
      website: university.website || '',
      status: university.status
    });
    setIsEditOpen(true);
  };

  const submitCreate = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: createForm.name.trim(),
        code: createForm.code.trim(),
        region_id: Number(createForm.region_id),
        address: createForm.address.trim() || undefined,
        contact_phone: createForm.contact_phone.trim() || undefined,
        contact_email: createForm.contact_email.trim() || undefined,
        website: createForm.website.trim() || undefined,
        status: createForm.status as 'active' | 'inactive' | 'suspended'
      };
      const res = await fetch('http://localhost:5000/api/universities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create university');
      }
      setUniversities((prev) => [data.data, ...prev]);
      setIsCreateOpen(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to create university');
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async () => {
    setSaving(true);
    setError('');
    try {
      const id = editForm.id;
      const payload: Record<string, any> = {
        name: editForm.name.trim(),
        code: editForm.code.trim(),
        region_id: Number(editForm.region_id),
        address: editForm.address.trim() || null,
        contact_phone: editForm.contact_phone.trim() || null,
        contact_email: editForm.contact_email.trim() || null,
        website: editForm.website.trim() || null,
        status: editForm.status
      };
      const res = await fetch(`http://localhost:5000/api/universities/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update university');
      }
      setUniversities((prev) => prev.map(u => u.id === id ? data.data : u));
      setIsEditOpen(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to update university');
    } finally {
      setSaving(false);
    }
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

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add University</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="code">Code</Label>
                  <Input id="code" value={createForm.code} onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })} />
                </div>
                <div>
                  <Label>Region</Label>
                  <Select value={createForm.region_id} onValueChange={(v) => setCreateForm({ ...createForm, region_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a region" />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={createForm.status} onValueChange={(v) => setCreateForm({ ...createForm, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" value={createForm.address} onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={createForm.contact_phone} onChange={(e) => setCreateForm({ ...createForm, contact_phone: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={createForm.contact_email} onChange={(e) => setCreateForm({ ...createForm, contact_email: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" value={createForm.website} onChange={(e) => setCreateForm({ ...createForm, website: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={submitCreate} disabled={saving || !createForm.name || !createForm.code || !createForm.region_id}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit University</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Name</Label>
                  <Input id="edit-name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="edit-code">Code</Label>
                  <Input id="edit-code" value={editForm.code} onChange={(e) => setEditForm({ ...editForm, code: e.target.value })} />
                </div>
                <div>
                  <Label>Region</Label>
                  <Select value={editForm.region_id} onValueChange={(v) => setEditForm({ ...editForm, region_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a region" />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="edit-address">Address</Label>
                  <Input id="edit-address" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input id="edit-phone" value={editForm.contact_phone} onChange={(e) => setEditForm({ ...editForm, contact_phone: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input id="edit-email" value={editForm.contact_email} onChange={(e) => setEditForm({ ...editForm, contact_email: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="edit-website">Website</Label>
                  <Input id="edit-website" value={editForm.website} onChange={(e) => setEditForm({ ...editForm, website: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button onClick={submitEdit} disabled={saving || !editForm.name || !editForm.code || !editForm.region_id}>Save changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
