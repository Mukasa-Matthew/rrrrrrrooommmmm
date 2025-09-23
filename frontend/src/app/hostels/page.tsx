'use client';

import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Hostel {
  id: number;
  name: string;
  address?: string;
  status?: string;
}

export default function HostelsPage() {
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState<'name' | 'created_at' | 'total_rooms'>('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const fetchHostels = async () => {
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(limit), sort, order });
        const res = await fetch(`http://localhost:5000/api/hostels?${params.toString()}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load hostels');
        setHostels(data.data || []);
        setTotal(Number(data.total || 0));
      } catch (e: any) {
        setError(e?.message || 'Failed to load hostels');
      } finally {
        setLoading(false);
      }
    };
    fetchHostels();
  }, [page, limit, sort, order]);

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold text-gray-900">Hostels</h1>
        <Card>
          <CardHeader>
            <CardTitle>All Hostels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <label className="text-sm">Sort by:</label>
              <select className="border rounded px-2 h-8" value={sort} onChange={(e) => setSort(e.target.value as any)}>
                <option value="name">Name</option>
                <option value="created_at">Created</option>
                <option value="total_rooms">Total Rooms</option>
              </select>
              <select className="border rounded px-2 h-8" value={order} onChange={(e) => setOrder(e.target.value as any)}>
                <option value="asc">Asc</option>
                <option value="desc">Desc</option>
              </select>
            </div>
            {loading ? (
              <p>Loading...</p>
            ) : error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : hostels.length === 0 ? (
              <p className="text-sm text-gray-600">No hostels found.</p>
            ) : (
              <div className="space-y-3">
                {hostels.map(h => (
                  <a key={h.id} href={`/hostels/${h.id}`} className="block border rounded p-3 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{h.name}</p>
                        {h.address && <p className="text-sm text-gray-600">{h.address}</p>}
                      </div>
                      <span className="text-xs text-gray-500">{h.status || 'ACTIVE'}</span>
                    </div>
                  </a>
                ))}
                <div className="flex items-center justify-between pt-4">
                  <div className="text-xs text-gray-500">Page {page} • Showing {hostels.length} of {total}</div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 border rounded disabled:opacity-50" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</button>
                    <button className="px-3 py-1 border rounded disabled:opacity-50" disabled={(page * limit) >= total} onClick={() => setPage(p => p + 1)}>Next</button>
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
