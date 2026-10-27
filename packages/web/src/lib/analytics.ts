type ProductEvent =
  | "signup_completed"
  | "exchange_created"
  | "invitation_accepted"
  | "wishlist_completed"
  | "draw_confirmed"
  | "assignment_viewed";

type EventProps = {
  intent?: "create" | "join" | "return";
  role?: "admin" | "member";
};

declare global {
  interface Window {
    amplitude?: {
      track: (event: string, props?: Record<string, string>) => void;
    };
  }
}

/** IDs only. Never pass a name, email, address, wishlist, token, or pairing. */
export function track(event: ProductEvent, props: EventProps = {}) {
  if (typeof window === "undefined" || !window.amplitude?.track) return;
  const payload: Record<string, string> = {};
  if (props.intent) payload.intent = props.intent;
  if (props.role) payload.role = props.role;
  window.amplitude.track(event, payload);
}
