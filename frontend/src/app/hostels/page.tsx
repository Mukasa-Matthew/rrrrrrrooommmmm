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

  useEffect(() => {
    const fetchHostels = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/hostels', {
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load hostels');
        setHostels(data.data || []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load hostels');
      } finally {
        setLoading(false);
      }
    };
    fetchHostels();
  }, []);

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold text-gray-900">Hostels</h1>
        <Card>
          <CardHeader>
            <CardTitle>All Hostels</CardTitle>
          </CardHeader>
          <CardContent>
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
