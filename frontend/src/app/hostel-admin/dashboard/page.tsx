'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/layout/Layout';
import { KeyRound, Users, Building2, DollarSign } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface HostelOverview { total_students?: number }
interface Room { status: string }
interface PaymentsSummary { total_collected: number; total_outstanding: number }

export default function HostelAdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<HostelOverview>({});
  const [rooms, setRooms] = useState<Room[]>([]);
  const [paymentsSummary, setPaymentsSummary] = useState<PaymentsSummary>({ total_collected: 0, total_outstanding: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.hostel_id) return;
      try {
        const res = await fetch(`http://localhost:5000/api/multi-tenant/hostel/${user.hostel_id}/overview`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        const data = await res.json();
        if (data?.success) {
          setStats({ total_students: Number(data.data.total_students || 0) });
        }

        const roomsRes = await fetch(`http://localhost:5000/api/rooms`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        const roomsData = await roomsRes.json();
        if (roomsData?.success) setRooms(roomsData.data || []);

        const paymentsRes = await fetch(`http://localhost:5000/api/payments/summary`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        const paymentsData = await paymentsRes.json();
        if (paymentsData?.success) {
          setPaymentsSummary({
            total_collected: Number(paymentsData.data.total_collected || 0),
            total_outstanding: Number(paymentsData.data.total_outstanding || 0)
          });
        }
      } catch {
        // silent
      }
    };
    fetchStats();
    const id = setInterval(fetchStats, 10000);
    return () => clearInterval(id);
  }, [user?.hostel_id]);

  // Also refresh payments summary more frequently
  useEffect(() => {
    const fetchPaymentsOnly = async () => {
      if (!user?.hostel_id) return;
      try {
        const paymentsRes = await fetch(`http://localhost:5000/api/payments/summary`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        const paymentsData = await paymentsRes.json();
        if (paymentsData?.success) {
          setPaymentsSummary({
            total_collected: Number(paymentsData.data.total_collected || 0),
            total_outstanding: Number(paymentsData.data.total_outstanding || 0)
          });
        }
      } catch {
        // silent
      }
    };
    
    fetchPaymentsOnly();
    const paymentsInterval = setInterval(fetchPaymentsOnly, 5000); // Refresh every 5 seconds
    return () => clearInterval(paymentsInterval);
  }, [user?.hostel_id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Hostel Admin</h1>
            <p className="text-gray-600 mt-2">Manage your account and overview</p>
          </div>
          <Button 
            onClick={async () => {
              try {
                const paymentsRes = await fetch(`http://localhost:5000/api/payments/summary`, {
                  headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
                });
                const paymentsData = await paymentsRes.json();
                if (paymentsData?.success) {
                  setPaymentsSummary({
                    total_collected: Number(paymentsData.data.total_collected || 0),
                    total_outstanding: Number(paymentsData.data.total_outstanding || 0)
                  });
                }
              } catch {}
            }}
            variant="outline"
          >
            Refresh Collections
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-green-600" />
                <span>Student Summary</span>
              </CardTitle>
              <CardDescription>Total students</CardDescription>
              </CardHeader>
              <CardContent>
              <div className="text-2xl font-bold">{stats.total_students ?? 0}</div>
              </CardContent>
            </Card>

            <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                <span>Room Occupancy</span>
              </CardTitle>
              <CardDescription>Occupied vs Available</CardDescription>
              </CardHeader>
              <CardContent>
              {(() => {
                const total = rooms.length;
                const occupied = rooms.filter((r) => r.status === 'occupied').length;
                const available = total - occupied;
                const rate = total > 0 ? Math.round((occupied / total) * 100) : 0;
                return (
                  <div>
                    <div className="text-2xl font-bold mb-2">{occupied}/{total}</div>
                    <p className="text-sm text-gray-600 mb-4">{rate}% occupancy rate</p>
                  </div>
                );
              })()}
              </CardContent>
            </Card>

            <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                <span>Collections</span>
              </CardTitle>
              <CardDescription>Total collected</CardDescription>
              </CardHeader>
              <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(paymentsSummary.total_collected)}
              </div>
              </CardContent>
            </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-orange-600" />
                <span>Outstanding</span>
              </CardTitle>
              <CardDescription>Balances due</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(paymentsSummary.total_outstanding)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <KeyRound className="h-5 w-5 text-blue-600" />
                <span>Change Credentials</span>
              </CardTitle>
              <CardDescription>Update your username and password</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <a href="/hostel-admin/change-password">Change Username & Password</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
