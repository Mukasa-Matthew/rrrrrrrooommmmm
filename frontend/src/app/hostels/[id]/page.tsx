'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface HostelOverview {
  hostel_name: string;
  address?: string;
  university_name?: string;
  region_name?: string;
  total_students: number;
  total_rooms: number;
  available_rooms: number;
  occupied_rooms: number;
  occupancy_rate: number;
  status?: string;
}

interface PaymentsSummary { total_collected: number; total_outstanding: number }
interface AdminSummary {
  admin_id: number | null;
  admin_name: string;
  admin_email: string;
  admin_username: string | null;
  admin_created_at: string | null;
  custodian_count: number;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
}

export default function HostelDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const hostelId = Number(params?.id);

  const [overview, setOverview] = useState<HostelOverview | null>(null);
  const [payments, setPayments] = useState<PaymentsSummary>({ total_collected: 0, total_outstanding: 0 });
  const [admin, setAdmin] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0 }).format(amount);

  const fetchData = async () => {
    setError('');
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token || !hostelId) return;

      // Hostel overview
      const o = await fetch(`http://localhost:5000/api/multi-tenant/hostel/${hostelId}/overview`, { headers: { Authorization: `Bearer ${token}` } });
      const oData = await o.json();
      if (o.ok && oData.success) setOverview(oData.data);

      // Payments summary (super_admin can pass hostel_id explicitly)
      const payUrl = `http://localhost:5000/api/payments/summary?hostel_id=${encodeURIComponent(String(hostelId))}`;
      const p = await fetch(payUrl, { headers: { Authorization: `Bearer ${token}` } });
      const pData = await p.json();
      if (p.ok && pData.success) setPayments({ total_collected: Number(pData.data.total_collected || 0), total_outstanding: Number(pData.data.total_outstanding || 0) });

      // Admin + custodians summary
      const a = await fetch(`http://localhost:5000/api/hostels/${hostelId}/admin-summary`, { headers: { Authorization: `Bearer ${token}` } });
      const aData = await a.json();
      if (a.ok && aData.success) setAdmin(aData.data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load hostel details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [hostelId]);

  if (loading) {
    return (
      <Layout>
        <div className="p-6">Loading hostel...</div>
      </Layout>
    );
  }

  if (!overview) {
    return (
      <Layout>
        <div className="p-6">
          <p className="text-sm text-gray-600">Hostel not found.</p>
          <Button className="mt-3" onClick={() => router.push('/hostels')}>Back to Hostels</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <Button variant="outline" onClick={() => router.back()}>Back</Button>

        <div>
          <h1 className="text-3xl font-bold text-gray-900">{overview.hostel_name}</h1>
          <p className="text-gray-600">{overview.address || ''}</p>
          <p className="text-sm text-gray-500">{overview.university_name || ''} {overview.region_name ? `• ${overview.region_name}` : ''}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.total_students}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Rooms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.occupied_rooms}/{overview.total_rooms}</div>
              <p className="text-xs text-muted-foreground">{overview.occupancy_rate}% occupancy</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Collections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(payments.total_collected)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Outstanding</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(payments.total_outstanding)}</div>
            </CardContent>
          </Card>
        </div>

        {admin && (
          <Card>
            <CardHeader>
              <CardTitle>Hostel Admin</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="font-semibold">{admin.admin_name}</div>
                  <div className="text-sm text-gray-600">{admin.admin_email}</div>
                  {admin.admin_username && (
                    <div className="text-xs text-gray-500">Username: {admin.admin_username}</div>
                  )}
                  {admin.admin_created_at && (
                    <div className="text-xs text-gray-500">Admin since: {new Date(admin.admin_created_at).toLocaleDateString()}</div>
                  )}
                </div>
                <div className="text-sm">
                  {admin.contact_phone && <div>Phone: <span className="text-gray-700">{admin.contact_phone}</span></div>}
                  {admin.contact_email && <div>Email: <span className="text-gray-700">{admin.contact_email}</span></div>}
                  {admin.address && <div>Address: <span className="text-gray-700">{admin.address}</span></div>}
                  <div className="mt-2 text-xs text-gray-500">Custodians: {admin.custodian_count}</div>
                </div>
              </div>
              <div className="mt-3">
                <a className="text-sm text-blue-600 hover:underline" href={`/hostel-admin/custodians?hostel_id=${hostelId}`}>View custodians</a>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
