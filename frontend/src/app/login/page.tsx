'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import Turnstile from '@/components/Turnstile';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const { login, user, isAuthenticated } = useAuth();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'super_admin') {
        router.push('/dashboard');
      } else if (user.role === 'hostel_admin') {
        router.push('/hostel-admin/dashboard');
      } else if ((user as any).role === 'custodian') {
        router.push('/custodian/dashboard');
      } else {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // @ts-ignore enhance login to accept captcha when backend requires it
      await login(identifier, password, captchaToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
  const isCaptchaEnabled = !!siteKey && process.env.NEXT_PUBLIC_DISABLE_TURNSTILE !== 'true';

  return (
    <div className="min-h-screen flex items-center justify-center relative py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" 
           style={{
             backgroundImage: `url('data:image/svg+xml;base64,${btoa(`
               <svg width="1920" height="1080" viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <defs>
                   <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                     <stop offset="0%" style="stop-color:#4f46e5;stop-opacity:0.1" />
                     <stop offset="50%" style="stop-color:#6366f1;stop-opacity:0.05" />
                     <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:0.1" />
                   </linearGradient>
                   <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                     <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" stroke-width="1" opacity="0.3"/>
                   </pattern>
                 </defs>
                 <rect width="1920" height="1080" fill="url(#bg-gradient)"/>
                 <rect width="1920" height="1080" fill="url(#grid)"/>
                 
                 <!-- Floating geometric shapes -->
                 <circle cx="200" cy="200" r="60" fill="#4f46e5" opacity="0.1"/>
                 <circle cx="1720" cy="300" r="80" fill="#6366f1" opacity="0.08"/>
                 <circle cx="300" cy="800" r="100" fill="#8b5cf6" opacity="0.06"/>
                 <circle cx="1600" cy="900" r="70" fill="#4f46e5" opacity="0.1"/>
                 
                 <!-- Modern hostel building silhouette -->
                 <g transform="translate(100, 400)">
                   <rect x="0" y="200" width="300" height="400" fill="#1e293b" opacity="0.1"/>
                   <rect x="20" y="220" width="40" height="40" fill="#4f46e5" opacity="0.2"/>
                   <rect x="80" y="220" width="40" height="40" fill="#4f46e5" opacity="0.2"/>
                   <rect x="140" y="220" width="40" height="40" fill="#4f46e5" opacity="0.2"/>
                   <rect x="200" y="220" width="40" height="40" fill="#4f46e5" opacity="0.2"/>
                   <rect x="260" y="220" width="40" height="40" fill="#4f46e5" opacity="0.2"/>
                   
                   <rect x="20" y="280" width="40" height="40" fill="#6366f1" opacity="0.15"/>
                   <rect x="80" y="280" width="40" height="40" fill="#6366f1" opacity="0.15"/>
                   <rect x="140" y="280" width="40" height="40" fill="#6366f1" opacity="0.15"/>
                   <rect x="200" y="280" width="40" height="40" fill="#6366f1" opacity="0.15"/>
                   <rect x="260" y="280" width="40" height="40" fill="#6366f1" opacity="0.15"/>
                   
                   <rect x="20" y="340" width="40" height="40" fill="#8b5cf6" opacity="0.1"/>
                   <rect x="80" y="340" width="40" height="40" fill="#8b5cf6" opacity="0.1"/>
                   <rect x="140" y="340" width="40" height="40" fill="#8b5cf6" opacity="0.1"/>
                   <rect x="200" y="340" width="40" height="40" fill="#8b5cf6" opacity="0.1"/>
                   <rect x="260" y="340" width="40" height="40" fill="#8b5cf6" opacity="0.1"/>
                 </g>
                 
                 <!-- Another building -->
                 <g transform="translate(1500, 300)">
                   <rect x="0" y="300" width="250" height="500" fill="#1e293b" opacity="0.08"/>
                   <rect x="15" y="320" width="35" height="35" fill="#4f46e5" opacity="0.15"/>
                   <rect x="65" y="320" width="35" height="35" fill="#4f46e5" opacity="0.15"/>
                   <rect x="115" y="320" width="35" height="35" fill="#4f46e5" opacity="0.15"/>
                   <rect x="165" y="320" width="35" height="35" fill="#4f46e5" opacity="0.15"/>
                   <rect x="215" y="320" width="35" height="35" fill="#4f46e5" opacity="0.15"/>
                   
                   <rect x="15" y="370" width="35" height="35" fill="#6366f1" opacity="0.12"/>
                   <rect x="65" y="370" width="35" height="35" fill="#6366f1" opacity="0.12"/>
                   <rect x="115" y="370" width="35" height="35" fill="#6366f1" opacity="0.12"/>
                   <rect x="165" y="370" width="35" height="35" fill="#6366f1" opacity="0.12"/>
                   <rect x="215" y="370" width="35" height="35" fill="#6366f1" opacity="0.12"/>
                 </g>
               </svg>
             `)}')`
           }}>
      </div>
      
      {/* Dark overlay for better readability */}
      <div className="absolute inset-0 bg-black/20"></div>
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-md space-y-8">
        {/* Brand Header */}
        <div className="text-center">
          <div className="mx-auto h-20 w-20 rounded-3xl gradient-bg flex items-center justify-center mb-6 shadow-2xl">
            <span className="text-3xl font-bold text-white">R</span>
          </div>
          <h1 className="text-4xl font-bold text-white drop-shadow-lg">RooMio</h1>
          <p className="text-slate-200 mt-3 text-lg font-medium">Modern Hostel Management</p>
        </div>

        <Card className="card-hover shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl text-center text-slate-800">Welcome Back</CardTitle>
            <CardDescription className="text-center text-slate-600">
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="identifier" className="text-slate-700 font-medium">Email or Username</Label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="admin@example.com or adminuser"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  className="h-11 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              {isCaptchaEnabled && (
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">Security Verification</Label>
                  <Turnstile siteKey={siteKey} onVerify={setCaptchaToken} />
                </div>
              )}
              
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full h-11 gradient-bg hover:opacity-90 text-white font-medium transition-all duration-200" 
                disabled={isLoading || (isCaptchaEnabled && !captchaToken)}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
