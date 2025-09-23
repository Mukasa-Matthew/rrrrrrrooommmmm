'use client';

import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Room {
  id: number;
  room_number: string;
  price: number | string;
  description?: string;
  status: 'available' | 'occupied' | 'maintenance';
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [form, setForm] = useState({ room_number: '', price: '', description: '' });
  const [saving, setSaving] = useState(false);

  const formatPrice = (p: number | string | undefined | null) => {
    const num = typeof p === 'string' ? parseFloat(p) : (p ?? 0);
    if (isNaN(num as number)) return '0.00';
    return (num as number).toFixed(2);
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/rooms', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load rooms');
      setRooms(data.data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        room_number: form.room_number.trim(),
        price: parseFloat(form.price),
        description: form.description.trim() || undefined
      };
      const res = await fetch('http://localhost:5000/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to create room');
      setForm({ room_number: '', price: '', description: '' });
      await fetchRooms();
      setNotice('Room created successfully');
      setTimeout(() => setNotice(''), 3000);
    } catch (e: any) {
      setError(e?.message || 'Failed to create room');
    } finally {
      setSaving(false);
    }
  };

  const updateRoom = async (id: number, updates: Partial<Room>) => {
    setError('');
    setNotice('');
    try {
      const res = await fetch(`http://localhost:5000/api/rooms/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update room');
      await fetchRooms();
      setNotice('Room updated');
      setTimeout(() => setNotice(''), 3000);
    } catch (e: any) {
      // Show backend error (e.g., cannot mark available)
      setError(e?.message || 'Failed to update room');
      setTimeout(() => setError(''), 4000);
    }
  };

  const deleteRoom = async (id: number) => {
    if (!confirm('Delete this room?')) return;
    setError('');
    setNotice('');
    try {
      const res = await fetch(`http://localhost:5000/api/rooms/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to delete room');
      await fetchRooms();
      setNotice('Room deleted');
      setTimeout(() => setNotice(''), 3000);
    } catch (e: any) {
      setError(e?.message || 'Failed to delete room');
      setTimeout(() => setError(''), 4000);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Rooms</h1>

        {notice && <div className="p-3 rounded bg-green-50 text-green-800 border border-green-200 text-sm">{notice}</div>}
        {error && <div className="p-3 rounded bg-red-50 text-red-800 border border-red-200 text-sm">{error}</div>}

        <Card>
          <CardHeader>
            <CardTitle>Add Room</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createRoom} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Room Number</Label>
                <Input value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} required />
              </div>
              <div>
                <Label>Price</Label>
                <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
              </div>
              <div className="md:col-span-3">
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              {error && <p className="text-sm text-red-600 md:col-span-3">{error}</p>}
              <div className="md:col-span-3">
                <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create Room'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Existing Rooms</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <div className="space-y-3">
                {rooms.length === 0 && <p className="text-sm text-gray-600">No rooms yet.</p>}
                {rooms.map((r) => (
                  <div key={r.id} className="border rounded p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">Room {r.room_number} - ${formatPrice(r.price)}</p>
                        <p className="text-sm text-gray-600">{r.description || 'No description'}</p>
                        <p className="text-xs mt-1">Status: <span className={r.status === 'available' ? 'text-green-700' : r.status === 'occupied' ? 'text-blue-700' : 'text-yellow-700'}>{r.status}</span></p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={() => {
                          const room_number = prompt('Room number', r.room_number) || undefined;
                          const priceStr = prompt('Price', String(r.price)) || undefined;
                          const description = prompt('Description', r.description || '') || undefined;
                          const price = priceStr !== undefined ? parseFloat(priceStr) : undefined;
                          updateRoom(r.id, { room_number, price, description });
                        }}>Edit</Button>
                        <Button variant="outline" size="sm" onClick={() => updateRoom(r.id, { status: r.status === 'available' ? 'occupied' : 'available' })}>
                          {r.status === 'available' ? 'Mark Occupied' : 'Mark Available'}
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => deleteRoom(r.id)}>Delete</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}















