"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

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
                Welcome to Secret Santa
              </h1>
              <p className="text-cream/60">
                Sign in with your email to get started
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <Input
                {...register("email")}
                type="email"
                label="Email address"
                placeholder="you@example.com"
                error={errors.email?.message}
                autoFocus
              />

              <Button type="submit" isLoading={isSubmitting} className="w-full">
                <Mail className="w-4 h-4 mr-2" />
                Send Magic Link
              </Button>
            </form>

            <p className="text-center text-cream/50 text-sm mt-6">
              We&apos;ll send you a secure link to sign in. No password needed!
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
