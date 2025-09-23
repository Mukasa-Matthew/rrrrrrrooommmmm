'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { enqueueRequest, flushQueue, initOfflineQueue } from '@/lib/offlineQueue';

interface Item {
  id: number;
  name: string;
  quantity: number;
  unit?: string;
  category?: string;
  status?: string;
  purchase_price?: number;
  notes?: string;
  created_at?: string;
}

const CATEGORY_OPTIONS = [
  'Furniture',
  'Electronics',
  'Cleaning Supplies',
  'Security',
  'Utilities',
  'Bedding',
  'Kitchen',
  'Other'
];

const STATUS_OPTIONS = ['active', 'damaged', 'lost', 'maintenance'];

export default function CustodianInventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [form, setForm] = useState({ name: '', quantity: '', category: '', purchase_price: '', status: 'active', notes: '' });
  const [editing, setEditing] = useState<Item | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchItems(); }, []);
  useEffect(() => { if (typeof window !== 'undefined') { initOfflineQueue(); } }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/inventory', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load inventory');
      setItems(data.data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(it => {
      const matchesQ = !q || it.name.toLowerCase().includes(q) || (it.category || '').toLowerCase().includes(q) || (it.status || '').toLowerCase().includes(q);
      const matchesCat = !categoryFilter || it.category === categoryFilter;
      const matchesStatus = !statusFilter || it.status === statusFilter;
      return matchesQ && matchesCat && matchesStatus;
    });
  }, [items, search, categoryFilter, statusFilter]);

  const createItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        quantity: form.quantity ? parseInt(form.quantity) : undefined,
        category: form.category || undefined,
        purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : undefined,
        status: form.status || undefined,
        notes: form.notes || undefined,
      };
      const url = 'http://localhost:5000/api/inventory';
      const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` } as Record<string, string>;
      try {
        const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Failed to create item');
      } catch {
        enqueueRequest({ url, method: 'POST', headers, body: payload });
      }
      setForm({ name: '', quantity: '', category: '', purchase_price: '', status: 'active', notes: '' });
      await fetchItems();
      await flushQueue();
    } catch (e: any) {
      setError(e?.message || 'Failed to create item');
    } finally {
      setSaving(false);
    }
  };

  const updateItem = async (id: number, updates: Partial<Item>) => {
    const url = `http://localhost:5000/api/inventory/${id}`;
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` } as Record<string, string>;
    try {
      const res = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(updates) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update item');
    } catch {
      enqueueRequest({ url, method: 'PUT', headers, body: updates });
    }
    setEditing(null);
    await fetchItems();
    await flushQueue();
  };

  const deleteItem = async (id: number) => {
    if (!confirm('Delete this item?')) return;
    const url = `http://localhost:5000/api/inventory/${id}`;
    const headers = { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` } as Record<string, string>;
    try {
      const res = await fetch(url, { method: 'DELETE', headers });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to delete item');
    } catch {
      enqueueRequest({ url, method: 'DELETE', headers });
    }
    await fetchItems();
    await flushQueue();
  };

  const badgeColor = (status?: string) => {
    switch ((status || '').toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'damaged': return 'bg-red-100 text-red-700';
      case 'lost': return 'bg-gray-200 text-gray-700';
      case 'maintenance': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const formatCurrency = (n?: number) => {
    if (!n && n !== 0) return '-';
    const val = Number(n);
    if (!isFinite(val)) return '-';
    return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0 }).format(val);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Add Item</CardTitle>
          </CardHeader>
          <CardContent>
            {!navigator.onLine && (
              <div className="mb-3 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-1 inline-block">Offline: changes will sync when online</div>
            )}
            <form onSubmit={createItem} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <Label>Quantity</Label>
                <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
              <div>
                <Label>Category</Label>
                <select className="border rounded h-10 px-2 w-full" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="">-- Select category --</option>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Purchase Price</Label>
                <Input type="number" step="0.01" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} />
              </div>
              <div>
                <Label>Status</Label>
                <select className="border rounded h-10 px-2 w-full" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-3">
                <Label>Notes</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              {error && <p className="text-sm text-red-600 md:col-span-3">{error}</p>}
              <div className="md:col-span-3">
                <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add Item'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
              <Input placeholder="Search by name, category, status" value={search} onChange={(e) => setSearch(e.target.value)} />
              <select className="border rounded h-10 px-2" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="">All categories</option>
                {CATEGORY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <select className="border rounded h-10 px-2" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All status</option>
                {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <Button variant="outline" onClick={fetchItems}>Refresh</Button>
            </div>

            {loading ? (
              <p>Loading...</p>
            ) : error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border rounded">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-sm text-gray-600">
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Qty</th>
                      <th className="px-3 py-2">Price</th>
                      <th className="px-3 py-2">Notes</th>
                      <th className="px-3 py-2">Added</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-3 py-6 text-center text-sm text-gray-600">No items found.</td>
                      </tr>
                    ) : (
                      filtered.map(it => (
                        <tr key={it.id} className="border-t">
                          <td className="px-3 py-2 font-medium">{it.name}</td>
                          <td className="px-3 py-2">{it.category || 'Uncategorized'}</td>
                          <td className="px-3 py-2"><span className={`px-2 py-1 rounded text-xs ${badgeColor(it.status)}`}>{it.status || 'n/a'}</span></td>
                          <td className="px-3 py-2">{it.quantity}</td>
                          <td className="px-3 py-2">{formatCurrency(it.purchase_price)}</td>
                          <td className="px-3 py-2 max-w-[240px] truncate" title={it.notes || ''}>{it.notes || '-'}</td>
                          <td className="px-3 py-2 text-xs text-gray-500">{it.created_at ? new Date(it.created_at).toLocaleDateString() : '-'}</td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => setEditing(it)}>Edit</Button>
                              <Button variant="destructive" size="sm" onClick={() => deleteItem(it.id)}>Delete</Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {editing && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                <div className="bg-white rounded shadow-lg w-full max-w-lg p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Edit Item</h3>
                    <button onClick={() => setEditing(null)} className="text-gray-500">✕</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Name</Label>
                      <Input defaultValue={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                    </div>
                    <div>
                      <Label>Quantity</Label>
                      <Input type="number" defaultValue={String(editing.quantity)} onChange={(e) => setEditing({ ...editing, quantity: parseInt(e.target.value || '0') })} />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <select className="border rounded h-10 px-2 w-full" value={editing.category || ''} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                        <option value="">-- Select category --</option>
                        {CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <select className="border rounded h-10 px-2 w-full" value={editing.status || ''} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <Label>Notes</Label>
                      <Input defaultValue={editing.notes || ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                    <Button onClick={() => updateItem(editing.id, { name: editing.name, quantity: editing.quantity, category: editing.category, status: editing.status, notes: editing.notes })}>Save</Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}



















