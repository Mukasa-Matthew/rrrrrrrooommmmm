'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Custodian {
  id: number;
  name: string;
  email: string;
  phone: string;
  location: string;
  national_id_image_path?: string;
  status?: 'active' | 'inactive';
  created_at: string;
}

function CustodiansContent() {
  const searchParams = useSearchParams();
  const hostelId = searchParams.get('hostel_id');
  const { user, isLoading: authLoading } = useAuth();
  const [custodians, setCustodians] = useState<Custodian[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create form state
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    national_id_image: null as File | null,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCustodians();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostelId]);

  const fetchCustodians = async () => {
    try {
      const listUrl = hostelId
        ? `http://localhost:5000/api/custodians?hostel_id=${encodeURIComponent(hostelId)}`
        : 'http://localhost:5000/api/custodians';
      const res = await fetch(listUrl, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load custodians');
      setCustodians(data.data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load custodians');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('email', form.email);
      fd.append('phone', form.phone);
      fd.append('location', form.location);
      if (form.national_id_image) fd.append('national_id_image', form.national_id_image);
      if (hostelId) fd.append('hostel_id', hostelId);

      const createUrl = hostelId
        ? `http://localhost:5000/api/custodians?hostel_id=${encodeURIComponent(hostelId)}`
        : 'http://localhost:5000/api/custodians';
      const res = await fetch(createUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
        body: fd
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to create custodian');
      await fetchCustodians();
      setForm({ name: '', email: '', phone: '', location: '', national_id_image: null });
    } catch (e: any) {
      setError(e?.message || 'Failed to create custodian');
    } finally {
      setSaving(false);
    }
  };

  const updateCustodian = async (id: number, updates: Partial<Pick<Custodian, 'phone' | 'location' | 'status'>> & { name?: string }) => {
    try {
      const res = await fetch(`http://localhost:5000/api/custodians/${id}` + (hostelId ? `?hostel_id=${hostelId}` : ''), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update custodian');
      await fetchCustodians();
    } catch (e: any) {
      setError(e?.message || 'Failed to update custodian');
    }
  };

  const deleteCustodian = async (id: number) => {
    if (!confirm('Delete this custodian?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/custodians/${id}` + (hostelId ? `?hostel_id=${hostelId}` : ''), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to delete custodian');
      await fetchCustodians();
    } catch (e: any) {
      setError(e?.message || 'Failed to delete custodian');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Custodians</h1>

      {user?.role === 'super_admin' && !hostelId && (
        <p className="text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded p-3">
          Hostel context missing. If you are a super admin, add <span className="font-mono">?hostel_id=ID</span> to the URL to manage a specific hostel.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Add Custodian</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            </div>
            <div>
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required />
            </div>
            <div className="md:col-span-2">
              <Label>National ID Image (optional)</Label>
              <Input type="file" accept="image/*" onChange={(e) => setForm({ ...form, national_id_image: e.target.files?.[0] || null })} />
            </div>
            {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}
            <div className="md:col-span-2">
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create Custodian'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Custodians</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="space-y-3">
              {custodians.length === 0 && <p className="text-sm text-gray-600">No custodians yet.</p>}
              {custodians.map((c) => (
                <div key={c.id} className="border rounded p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{c.name} <span className="text-xs text-gray-500">({c.email})</span></p>
                      <p className="text-sm text-gray-600">{c.phone} • {c.location}</p>
                      <p className="text-xs mt-1">Status: <span className={c.status === 'active' ? 'text-green-700' : 'text-red-700'}>{c.status || 'active'}</span></p>
                    </div>
                    <div className="flex items-center gap-3">
                      {c.national_id_image_path && (
                        <a className="text-blue-600 text-sm" href={`http://localhost:5000${c.national_id_image_path}`} target="_blank">View ID</a>
                      )}
                      <Button variant="outline" size="sm" onClick={() => updateCustodian(c.id, { status: c.status === 'active' ? 'inactive' : 'active' })}>
                        {c.status === 'active' ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        const name = prompt('Update name', c.name) || undefined;
                        const phone = prompt('Update phone', c.phone) || undefined;
                        const location = prompt('Update location', c.location) || undefined;
                        updateCustodian(c.id, { name, phone, location });
                      }}>Edit</Button>
                      <Button variant="destructive" size="sm" onClick={() => deleteCustodian(c.id)}>Delete</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function CustodiansPage() {
  return (
    <Layout>
      <Suspense fallback={<div className="p-6">Loading...</div>}>
        <CustodiansContent />
      </Suspense>
    </Layout>
  );
}




















