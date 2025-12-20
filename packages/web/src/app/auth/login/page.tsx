"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { oauthConfig } from "@/lib/oauth-config";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, Mail } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type FormData = z.infer<typeof schema>;

// Google icon component
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

// Apple icon component
function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function LoginPageContent() {
  const searchParams = useSearchParams();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);

  // Get redirect URL from query params (for post-login redirect)
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await api.sendMagicLink(data.email);
      setSubmittedEmail(data.email);
      setIsSubmitted(true);
    } catch (error) {
      console.error("Failed to send magic link:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to send magic link"
      );
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      // Store redirect URL for after OAuth callback
      sessionStorage.setItem("oauth_redirect", redirectTo);
      const { url } = await api.getGoogleAuthUrl(redirectTo);
      window.location.href = url;
    } catch (error) {
      console.error("Failed to initiate Google sign-in:", error);
      toast.error("Failed to connect to Google. Please try again.");
      setIsGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsAppleLoading(true);
    try {
      // Store redirect URL for after OAuth callback
      sessionStorage.setItem("oauth_redirect", redirectTo);
      const { url } = await api.getAppleAuthUrl(redirectTo);
      window.location.href = url;
    } catch (error) {
      console.error("Failed to initiate Apple sign-in:", error);
      toast.error("Failed to connect to Apple. Please try again.");
      setIsAppleLoading(false);
    }
  };

  if (isSubmitted) {
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
              <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h1 className="text-2xl font-display font-bold text-cream mb-2">
                Check Your Email
              </h1>
              <p className="text-cream/70 mb-6">
                We sent a magic link to{" "}
                <span className="text-gold font-medium">{submittedEmail}</span>
              </p>
              <p className="text-cream/50 text-sm mb-6">
                Click the link in the email to sign in. The link will expire in
                15 minutes.
              </p>
              <Button
                variant="secondary"
                onClick={() => setIsSubmitted(false)}
                className="w-full"
              >
                Use a different email
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Link
          href="/"
          className="inline-flex items-center text-cream/60 hover:text-cream transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to home
        </Link>

        <Card>
          <CardContent className="pt-8 pb-6">
            <div className="text-center mb-8">
              <span className="text-4xl mb-4 block">🎄</span>
              <h1 className="text-2xl font-display font-bold text-cream mb-2">
                Welcome! Let&apos;s get you started
              </h1>
              <p className="text-cream/60">
                Sign in to organize your Secret Santa
              </p>
            </div>

            {/* Social Sign-In Buttons */}
            {(oauthConfig.google.enabled || oauthConfig.apple.enabled) && (
              <>
                <div className="space-y-3 mb-6">
                  {oauthConfig.google.enabled && (
                    <button
                      onClick={handleGoogleSignIn}
                      disabled={isGoogleLoading || isAppleLoading}
                      className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 text-gray-800 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
                    >
                      {isGoogleLoading ? (
                        <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                      ) : (
                        <GoogleIcon className="w-5 h-5" />
                      )}
                      <span>Continue with Google</span>
                    </button>
                  )}

                  {oauthConfig.apple.enabled && (
                    <button
                      onClick={handleAppleSignIn}
                      disabled={isGoogleLoading || isAppleLoading}
                      className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-black hover:bg-gray-900 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
                    >
                      {isAppleLoading ? (
                        <div className="w-5 h-5 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
                      ) : (
                        <AppleIcon className="w-5 h-5" />
                      )}
                      <span>Continue with Apple</span>
                    </button>
                  )}
                </div>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-cream/20" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-gradient-card text-cream/50">
                      or continue with email
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Magic Link Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <Input
                {...register("email")}
                type="email"
                label="Email address"
                placeholder="you@example.com"
                error={errors.email?.message}
              />

              <Button type="submit" isLoading={isSubmitting} className="w-full">
                <Mail className="w-4 h-4 mr-2" />
                Send Magic Link
              </Button>
            </form>

            <p className="text-center text-cream/50 text-sm mt-6">
              We&apos;ll email you a secure sign-in link
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
