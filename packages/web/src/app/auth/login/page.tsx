"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { oauthConfig } from "@/lib/oauth-config";
import {
  invitePath,
  inviteTokenFromPath,
  rememberedInvite,
} from "@/lib/pending-invite";
import { useClerk, useSignIn, useSignUp } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const emailSchema = z.object({
  email: z.string().email("Enter an email address like name@example.com"),
});

const codeSchema = z.object({
  code: z.string().min(6, "Enter the 6-digit code from your email"),
});

type EmailForm = z.infer<typeof emailSchema>;
type CodeForm = z.infer<typeof codeSchema>;

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

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function LoginPageContent() {
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const clerk = useClerk();
  const [step, setStep] = useState<"email" | "code">("email");
  const [verifyingSignUp, setVerifyingSignUp] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);

  const requestedRedirect = searchParams.get("redirect") || "";
  const intent = searchParams.get("intent");
  const [storedInvite, setStoredInvite] = useState<string | null>(null);
  useEffect(() => {
    setStoredInvite(rememberedInvite());
  }, []);
  const inviteRedirect = inviteTokenFromPath(requestedRedirect)
    ? requestedRedirect
    : storedInvite
      ? invitePath(storedInvite)
      : "";
  const joining = intent === "join" || Boolean(inviteRedirect);
  const creating = intent === "create" && !joining;
  const redirectTo = joining
    ? inviteRedirect || "/dashboard"
    : creating
      ? "/dashboard?new=1"
      : requestedRedirect.startsWith("/") && !requestedRedirect.startsWith("//")
        ? requestedRedirect
        : "/dashboard";

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, router, redirectTo]);

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
  });

  const codeForm = useForm<CodeForm>({
    resolver: zodResolver(codeSchema),
  });

  const clerkErrorCode = (error: unknown): string => {
    if (!error || typeof error !== "object" || !("errors" in error)) return "";
    const errors = (error as { errors?: Array<{ code?: string }> }).errors;
    return errors?.[0]?.code || "";
  };

  const clerkErrorMessage = (error: unknown, fallback: string): string => {
    if (!error || typeof error !== "object" || !("errors" in error)) {
      return error instanceof Error ? error.message : fallback;
    }
    const errors = (error as { errors?: Array<{ longMessage?: string; message?: string }> }).errors;
    return errors?.[0]?.longMessage || errors?.[0]?.message || fallback;
  };

  const handleEmailSubmit = async (data: EmailForm) => {
    if (!signIn || !signUp) return;
    try {
      // Clear any stale session so Clerk doesn't return session_exists
      try { await clerk.signOut(); } catch {}
      const result = await signIn.create({ identifier: data.email });

      // Find the email code factor to get emailAddressId
      const emailFactor = result.supportedFirstFactors?.find(
        (f) => f.strategy === "email_code"
      );
      const emailAddressId = (
        emailFactor as { emailAddressId?: string } | undefined
      )?.emailAddressId;

      if (!emailAddressId) {
        throw new Error("Email sign-in is not switched on. Write to hello@elfmatch.com.");
      }

      await signIn.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId,
      });

      setVerifyingSignUp(false);
      setSubmittedEmail(data.email);
      setStep("code");
    } catch (error) {
      // A shared invite link is how a new person arrives. An email that
      // has no account yet is a sign-up, not a failure.
      if (clerkErrorCode(error) === "form_identifier_not_found") {
        try {
          await signUp.create({ emailAddress: data.email });
          await signUp.prepareEmailAddressVerification({
            strategy: "email_code",
          });
          setVerifyingSignUp(true);
          setSubmittedEmail(data.email);
          setStep("code");
          return;
        } catch (signUpError) {
          console.error("Failed to start sign-up:", signUpError);
          toast.error(
            clerkErrorMessage(signUpError, "Failed to send sign-in code")
          );
          return;
        }
      }
      console.error("Failed to send code:", error);
      toast.error(clerkErrorMessage(error, "Failed to send sign-in code"));
    }
  };

  const handleCodeSubmit = async (data: CodeForm) => {
    if (!signIn || !signUp || !setActive) return;
    try {
      if (verifyingSignUp) {
        const result = await signUp.attemptEmailAddressVerification({
          code: data.code,
        });
        if (result.status === "complete") {
          await setActive({ session: result.createdSessionId });
          router.push(redirectTo);
        } else {
          toast.error("The account was not finished. Ask for help at hello@elfmatch.com.");
        }
        return;
      }

      const result = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code: data.code,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push(redirectTo);
      }
    } catch (error) {
      console.error("Failed to verify code:", error);
      toast.error(clerkErrorMessage(error, "That code did not work. Ask for a new one."));
    }
  };

  const handleGoogleSignIn = async () => {
    if (!signIn) return;
    setIsGoogleLoading(true);
    try {
      // Clear any stale session so Clerk doesn't return session_exists
      try { await clerk.signOut(); } catch {}
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectUrlComplete: redirectTo,
      });
    } catch (error) {
      console.error("Failed to initiate Google sign-in:", error);
      toast.error("Google did not connect. Try again.");
      setIsGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (!signIn) return;
    setIsAppleLoading(true);
    try {
      // Clear any stale session so Clerk doesn't return session_exists
      try { await clerk.signOut(); } catch {}
      await signIn.authenticateWithRedirect({
        strategy: "oauth_apple",
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectUrlComplete: redirectTo,
      });
    } catch (error) {
      console.error("Failed to initiate Apple sign-in:", error);
      toast.error("Apple did not connect. Try again.");
      setIsAppleLoading(false);
    }
  };

  if (isLoading || isAuthenticated || !signInLoaded || !signUpLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-evergreen border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex justify-center px-4 py-16">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.25 }}
        className="w-full max-w-md"
      >
        <Link
          href="/"
          className="mb-8 inline-flex items-center text-ink-soft hover:text-ink"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to home
        </Link>

        <Card>
          <CardContent className="pt-8 pb-6">
            <div className="mb-8">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-cranberry">
                Elf Match
              </p>
              <h1 className="mt-2 font-display text-3xl text-evergreen">
                {step === "code"
                  ? "Enter the code"
                  : creating
                    ? "Start an exchange"
                    : joining
                      ? "Join the exchange"
                      : "Sign in"}
              </h1>
              <p className="mt-2 text-ink-soft">
                {step === "code"
                  ? `A 6-digit code is on its way to ${submittedEmail}.`
                  : creating
                    ? "Use an email you will still check in December. A 6-digit code will arrive there. No password."
                    : joining
                      ? inviteRedirect
                        ? "Sign in or create your account. You will come back to the invitation and can join from there."
                        : "Use the email that received the invitation. A different email will not see the seat."
                      : "Sign in with the email on the exchange. A 6-digit code will arrive there. No password."}
              </p>
            </div>

            {step === "email" && (
              <>
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

                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-rule" />
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="bg-ivory-card px-4 text-ink-faint">
                          or continue with email
                        </span>
                      </div>
                    </div>
                  </>
                )}

                <form
                  onSubmit={emailForm.handleSubmit(handleEmailSubmit)}
                  className="space-y-6"
                >
                  {/* Clerk renders the bot check here when a new account is created. */}
                  <div id="clerk-captcha" />
                  <Input
                    {...emailForm.register("email")}
                    type="email"
                    label="Email address"
                    placeholder="you@example.com"
                    error={emailForm.formState.errors.email?.message}
                  />

                  {creating && (
                    <ul className="space-y-1 text-sm text-ink-soft">
                      <li>You will name the exchange, set a date, and invite people with a link or by email.</li>
                      <li>It is free. You choose the currency for the budget.</li>
                    </ul>
                  )}

                  <Button
                    type="submit"
                    isLoading={emailForm.formState.isSubmitting}
                    className="w-full"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Email me a sign-in code
                  </Button>
                </form>

                <p className="mt-6 text-sm text-ink-faint">
                  The code arrives by email. There is no password to set.
                </p>
              </>
            )}

            {step === "code" && (
              <form
                onSubmit={codeForm.handleSubmit(handleCodeSubmit)}
                className="space-y-6"
              >
                <Input
                  {...codeForm.register("code")}
                  type="text"
                  inputMode="numeric"
                  label="Sign-in code"
                  placeholder="000000"
                  error={codeForm.formState.errors.code?.message}
                />

                <Button
                  type="submit"
                  isLoading={codeForm.formState.isSubmitting}
                  className="w-full"
                >
                  Sign In
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setVerifyingSignUp(false);
                    setStep("email");
                  }}
                  className="w-full text-sm text-ink-faint hover:text-ink"
                >
                  Use a different email
                </button>
              </form>
            )}
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
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-evergreen border-t-transparent" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
