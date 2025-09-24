'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { API_CONFIG, getAuthHeaders } from '@/config/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

interface SubscriptionPlan {
  id: number;
  name: string;
  description?: string;
  duration_months: number;
  price_per_month: number;
  total_price: number;
}

interface HostelSubscription {
  id: number;
  plan_id: number;
  plan_name?: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'cancelled';
  amount_paid?: number;
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
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<HostelSubscription[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0 }).format(amount);

  const fetchData = async () => {
    setError('');
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token || !hostelId) return;

      // Hostel overview
      const o = await fetch(`${API_CONFIG.ENDPOINTS.ANALYTICS.HOSTEL_OVERVIEW}/${hostelId}/overview`, { headers: getAuthHeaders() });
      const oData = await o.json();
      if (o.ok && oData.success) setOverview(oData.data);

      // Payments summary (super_admin can pass hostel_id explicitly)
      const payUrl = `${API_CONFIG.BASE_URL}/api/payments/summary?hostel_id=${encodeURIComponent(String(hostelId))}`;
      const p = await fetch(payUrl, { headers: getAuthHeaders() });
      const pData = await p.json();
      if (p.ok && pData.success) setPayments({ total_collected: Number(pData.data.total_collected || 0), total_outstanding: Number(pData.data.total_outstanding || 0) });

      // Admin + custodians summary
      const a = await fetch(`${API_CONFIG.ENDPOINTS.HOSTELS.ADMIN_SUMMARY}/${hostelId}/admin-summary`, { headers: getAuthHeaders() });
      const aData = await a.json();
      if (a.ok && aData.success) setAdmin(aData.data);

      // Plans
      const plansRes = await fetch(API_CONFIG.ENDPOINTS.SUBSCRIPTION_PLANS.LIST, { headers: getAuthHeaders() });
      const plansData = await plansRes.json();
      const plansArray = plansData.plans || plansData.data || [];
      setPlans(plansArray);

      // Existing subscriptions for this hostel
      const subsRes = await fetch(`${API_CONFIG.ENDPOINTS.SUBSCRIPTION_PLANS.HOSTEL_SUBSCRIPTIONS}/${hostelId}`, { headers: getAuthHeaders() });
      const subsData = await subsRes.json();
      const subsArray: HostelSubscription[] = subsData.subscriptions || subsData.data || [];
      setSubscriptions(subsArray);
    } catch (e: any) {
      setError(e?.message || 'Failed to load hostel details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [hostelId]);

  const latestSubscription = subscriptions && subscriptions.length > 0 ? subscriptions[0] : null;
  const hasActiveSubscription = latestSubscription && latestSubscription.status === 'active' && new Date(latestSubscription.end_date) >= new Date();

  const handleSubscribe = async () => {
    setActionError('');
    setActionSuccess('');
    if (!selectedPlanId) {
      setActionError('Please select a subscription plan');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch(`${API_CONFIG.ENDPOINTS.SUBSCRIPTION_PLANS.SUBSCRIBE_HOSTEL}/${hostelId}/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ plan_id: Number(selectedPlanId) })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to start subscription');
      setActionSuccess('Subscription started successfully');
      setSelectedPlanId('');
      await fetchData();
    } catch (e: any) {
      setActionError(e?.message || 'Failed to start subscription');
    } finally {
      setSubmitting(false);
    }
  };

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

        {/* Subscription Management */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {actionError && (
              <Alert variant="destructive">
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            )}
            {actionSuccess && (
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">{actionSuccess}</AlertDescription>
              </Alert>
            )}

            {hasActiveSubscription && latestSubscription ? (
              <div className="text-sm text-gray-700">
                <div>Plan: <span className="font-medium">{latestSubscription.plan_name || ''}</span></div>
                <div>Start: {new Date(latestSubscription.start_date).toLocaleDateString()}</div>
                <div>End: {new Date(latestSubscription.end_date).toLocaleDateString()}</div>
                <div>Status: <span className="font-medium">{latestSubscription.status}</span></div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-gray-700">No active subscription. Start one below:</div>
                <div className="max-w-md">
                  <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subscription plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map(plan => (
                        <SelectItem key={plan.id} value={String(plan.id)}>
                          <div className="flex flex-col">
                            <span className="font-medium">{plan.name}</span>
                            <span className="text-xs text-gray-500">{plan.duration_months} months • UGX {plan.total_price.toLocaleString()}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Button onClick={handleSubscribe} disabled={submitting}>
                    {submitting ? 'Starting...' : 'Start Subscription'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
