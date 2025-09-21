'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // Redirect based on user role
        if (user.role === 'super_admin') {
          router.push('/dashboard');
        } else if (user.role === 'hostel_admin') {
          router.push('/hostel-admin/dashboard');
        } else {
          router.push('/dashboard');
        }
      } else {
        router.push('/login');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">LTS Portal</h1>
        <p>Redirecting...</p>
      </div>
    </div>
  );
}
