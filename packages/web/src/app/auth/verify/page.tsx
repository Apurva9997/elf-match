'use client';

import { useEffect, useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setError('Invalid or missing token');
      return;
    }

    const verify = async () => {
      try {
        const data = await api.verifyMagicLink(token);
        login(data.accessToken, data.refreshToken, data.user);
        setStatus('success');
        
        // Redirect after a brief delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Failed to verify link');
      }
    };

    verify();
  }, [searchParams, login, router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="text-center">
          <CardContent className="pt-8 pb-6">
            {status === 'loading' && (
              <>
                <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-6">
                  <Loader2 className="w-8 h-8 text-gold animate-spin" />
                </div>
                <h1 className="text-2xl font-display font-bold text-cream mb-2">
                  Verifying...
                </h1>
                <p className="text-cream/70">
                  Please wait while we sign you in.
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-success" />
                </div>
                <h1 className="text-2xl font-display font-bold text-cream mb-2">
                  Welcome!
                </h1>
                <p className="text-cream/70">
                  You&apos;re signed in. Redirecting to dashboard...
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="w-16 h-16 rounded-full bg-error/20 flex items-center justify-center mx-auto mb-6">
                  <XCircle className="w-8 h-8 text-error" />
                </div>
                <h1 className="text-2xl font-display font-bold text-cream mb-2">
                  Verification Failed
                </h1>
                <p className="text-cream/70 mb-6">{error}</p>
                <Button onClick={() => router.push('/auth/login')} className="w-full">
                  Try Again
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}

