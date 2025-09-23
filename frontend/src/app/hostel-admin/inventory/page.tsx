'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  description?: string;
  category?: string;
  status?: string;
  purchase_price?: number;
  notes?: string;
  created_at: string;
}

const CATEGORY_OPTIONS = [
  'Furniture', 'Electronics', 'Cleaning Supplies', 'Security', 'Utilities', 'Bedding', 'Kitchen', 'Other'
];
const STATUS_OPTIONS = ['active', 'damaged', 'lost', 'maintenance'];

export default function HostelAdminInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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

  useEffect(() => { fetchItems(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(it => {
      const matchesQ = !q || it.name.toLowerCase().includes(q) || (it.category || '').toLowerCase().includes(q) || (it.status || '').toLowerCase().includes(q) || (it.description || '').toLowerCase().includes(q);
      const matchesCat = !categoryFilter || it.category === categoryFilter;
      const matchesStatus = !statusFilter || it.status === statusFilter;
      return matchesQ && matchesCat && matchesStatus;
    });
  }, [items, search, categoryFilter, statusFilter]);

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
        <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>

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
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-6 text-center text-sm text-gray-600">No items found.</td>
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
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
