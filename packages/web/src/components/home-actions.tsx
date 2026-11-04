import Link from "next/link";

export function HomeActions() {
  return (
    <div className="mt-8">
      <Link
        href="/auth/login?intent=create"
        className="inline-flex items-center justify-center bg-cranberry px-5 py-3 text-base font-semibold text-ivory hover:bg-cranberry-deep"
      >
        Create an exchange
      </Link>
      <Link
        href="/auth/login?intent=join"
        className="mt-3 block text-base font-semibold text-evergreen underline-offset-2 hover:underline"
      >
        I have an invitation
      </Link>
    </div>
  );
}
