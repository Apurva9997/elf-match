"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { track } from "@/lib/analytics";
import { useAuth } from "@/lib/auth-context";
import {
  invitePath,
  forgetInvite,
  markInviteNudged,
  rememberInvite,
} from "@/lib/pending-invite";
import { formatDate } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Preview = {
  kind?: "link" | "email";
  status: string;
  exchangeName: string;
  hostName: string;
  exchangeDate: string | null;
  wishlistDeadline: string | null;
  budgetMin: string | null;
  budgetMax: string | null;
};

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const { user, isLoading: authLoading, logout } = useAuth();
  const reduce = useReducedMotion();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinedName, setJoinedName] = useState("");

  useEffect(() => {
    if (token) rememberInvite(token);
  }, [token]);

  useEffect(() => {
    if (!authLoading && user) markInviteNudged();
  }, [authLoading, user]);

  useEffect(() => {
    let cancelled = false;
    api
      .previewInvitation(token)
      .then((result) => {
        if (cancelled) return;
        const closed =
          result.kind === "link"
            ? result.status !== "open"
            : result.status !== "pending";
        if (closed) forgetInvite();
        setPreview(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "This invitation did not open";
        if (/not found|already used|no longer open/i.test(message)) {
          forgetInvite();
        }
        setError(message);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const join = async () => {
    setJoining(true);
    try {
      const result = await api.acceptInvitation(token);
      forgetInvite();
      track("invitation_accepted", { role: "member" });
      setJoinedName(result.team.name);
      window.setTimeout(() => {
        router.push(`/dashboard/teams/${result.team.id}`);
      }, reduce ? 0 : 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "This invitation did not open");
      setJoining(false);
    }
  };

  const budget =
    preview?.budgetMin && preview.budgetMax
      ? `₹${Number(preview.budgetMin)} – ₹${Number(preview.budgetMax)}`
      : null;

  return (
    <div className="flex justify-center px-4 py-16">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardContent className="pt-8 pb-6">
            {!preview && !error && (
              <p className="text-ink-soft">Opening the invitation.</p>
            )}

            {error && !preview && (
              <>
                <h1 className="font-display text-3xl text-evergreen">
                  This invitation did not open
                </h1>
                <p className="mt-3 text-ink-soft">{error}</p>
                <p className="mt-3 text-sm text-ink-soft">
                  Ask the organizer for a new link, or sign in with the email that received the invitation.
                </p>
                <Button onClick={() => router.push("/dashboard")} className="mt-6 w-full">
                  Go to your exchanges
                </Button>
              </>
            )}

            {preview && !joinedName && (
              <>
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-cranberry">
                  Invitation
                </p>
                <h1 className="mt-2 font-display text-3xl text-evergreen">
                  {preview.hostName} invited you to {preview.exchangeName}.
                </h1>
                <dl className="mt-5 space-y-2 text-sm text-ink-soft">
                  {preview.exchangeDate && (
                    <div className="flex justify-between gap-4">
                      <dt>Exchange</dt>
                      <dd className="text-ink">{formatDate(preview.exchangeDate)}</dd>
                    </div>
                  )}
                  {preview.wishlistDeadline && (
                    <div className="flex justify-between gap-4">
                      <dt>Wishlists due</dt>
                      <dd className="text-ink">{formatDate(preview.wishlistDeadline)}</dd>
                    </div>
                  )}
                  {budget && (
                    <div className="flex justify-between gap-4">
                      <dt>Budget</dt>
                      <dd className="text-ink">{budget}</dd>
                    </div>
                  )}
                </dl>
                <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                  {preview.kind === "link"
                    ? "You join as yourself. You will write a wishlist. After the draw, only the person buying for you can read it."
                    : "You will write a wishlist. After the draw, only the person buying for you can read it. Your delivery address, if you add one, is shown only to that person."}
                </p>
                {(preview.kind === "link"
                  ? preview.status !== "open"
                  : preview.status !== "pending") ? (
                  <p className="mt-4 text-sm text-cranberry">
                    {preview.kind === "link" && preview.status === "signing_off"
                      ? `${preview.hostName} has turned off joining by link for ${preview.exchangeName}. The address is unchanged. Ask them to turn it back on.`
                      : preview.kind === "link" && preview.status === "draw_locked"
                        ? `Names have already been drawn for ${preview.exchangeName}. A late join is not added to the draw.`
                        : preview.kind === "link"
                          ? `This invite link for ${preview.exchangeName} is no longer open. Ask ${preview.hostName} for a new one.`
                          : `This invitation to ${preview.exchangeName} is no longer open. Ask ${preview.hostName} to resend it.`}
                  </p>
                ) : authLoading ? (
                  <p className="mt-6 text-sm text-ink-soft">Checking your account.</p>
                ) : error ? (
                  <div className="mt-4">
                    <p className="text-sm text-cranberry">{error}</p>
                    {error.includes("signed in as") && (
                      <Button
                        variant="secondary"
                        className="mt-4 w-full"
                        onClick={() => logout()}
                      >
                        Sign out and use {error.match(/sent to ([^\s]+)\./)?.[1] || "the invited email"}
                      </Button>
                    )}
                  </div>
                ) : user ? (
                  <Button onClick={join} isLoading={joining} className="mt-6 w-full">
                    Join {preview.exchangeName}
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      rememberInvite(token);
                      router.push(
                        `/auth/login?intent=join&redirect=${encodeURIComponent(invitePath(token))}`
                      );
                    }}
                    className="mt-6 w-full"
                  >
                    Sign in to join
                  </Button>
                )}
              </>
            )}

            {joinedName && (
              <>
                <h1 className="font-display text-3xl text-evergreen">You&apos;re in.</h1>
                <p className="mt-3 text-ink-soft">Opening {joinedName}.</p>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
