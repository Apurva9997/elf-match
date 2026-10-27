import { PublicFooter } from "@/components/public-footer";
import { PublicNav } from "@/components/public-nav";
import { Metadata } from "next";
import Link from "next/link";
import { FAQAccordion } from "./faq-accordion";

export const metadata: Metadata = {
  title: "FAQ - Frequently Asked Questions About Secret Santa",
  description:
    "Answers about budgets, invitations, exclusions, wishlists, and who can see a Secret Santa assignment on Elf Match.",
  alternates: {
    canonical: "https://elfmatch.com/faq",
  },
  openGraph: {
    title: "Secret Santa FAQ - Common Questions Answered",
    description:
      "Budgets, invitations, exclusions, and who can see an assignment.",
  },
};

// FAQ data structured for SEO (can also be used for FAQ schema markup)
const faqs = [
  {
    question: "What is Elf Match?",
    answer:
      "Elf Match is a free tool for organizing a Secret Santa or other gift exchange. You create an exchange, invite people by email, collect wishlists, optionally keep certain pairs from matching, and send each person a private assignment.",
  },
  {
    question: "Is Elf Match free?",
    answer:
      "Yes. There is no paid tier and no card required to create an exchange or join one.",
  },
  {
    question: "How many people can join a Secret Santa exchange?",
    answer:
      "A draw needs at least three people who have joined. There is no participant cap. People with a still-open invitation are not included until they accept.",
  },
  {
    question: "How do I invite people to my Secret Santa exchange?",
    answer:
      "After creating your exchange, simply enter the email addresses of everyone you want to invite. They'll receive an email with a link to join your exchange. They can then create their account, add their wishlist, and wait for assignments.",
  },
  {
    question: "What are exclusion rules and how do they work?",
    answer:
      "Exclusion rules prevent certain pairs of people from being matched. This is useful for couples, family members, or anyone who shouldn't gift each other. When you set an exclusion, neither person can be assigned to gift the other. Our matching algorithm respects all exclusions.",
  },
  {
    question: "Can I set a budget for the gift exchange?",
    answer:
      "Yes! When creating your exchange, you can set a minimum and maximum budget. This is displayed to all participants so everyone knows how much to spend. The budget is shown in the exchange details and on wishlists.",
  },
  {
    question: "How does the Secret Santa matching work?",
    answer:
      "When at least three people have joined, you can assign Santas. The draw is random, never assigns someone to themselves, and keeps every exclusion. You preview the full list, and you can generate another set before confirming. Confirming emails each person only their own recipient.",
  },
  {
    question: "Can I see who everyone else got matched with?",
    answer:
      "As the exchange admin, you can preview all assignments before sending them out. However, once assignments are sent, each participant only sees their own assignment. This keeps the surprise intact!",
  },
  {
    question: "What if I want to redo the assignments?",
    answer:
      "Before confirming assignments, you can regenerate new random matches as many times as you want. However, once assignments are confirmed and emails are sent, they cannot be changed - so review carefully before confirming!",
  },
  {
    question: "Do participants need to create an account?",
    answer:
      "Yes, participants need to create a free account to join an exchange. We use passwordless login (magic links sent to email) so there's no password to remember. This ensures everyone's wishlist and assignment stays secure.",
  },
  {
    question: "Can I add items to my wishlist with links?",
    answer:
      "Absolutely! For each wishlist item, you can add a title, description, price estimate, and a link to where the item can be purchased (like Amazon, Flipkart, etc.). This makes it easy for your Secret Santa to find exactly what you want.",
  },
  {
    question: "Is my delivery address shared with everyone?",
    answer:
      "No. Your delivery address is only shared with your assigned Secret Santa - the person who needs to send you a gift. Other participants cannot see your address.",
  },
  {
    question: "Can I track if my Secret Santa has bought or shipped my gift?",
    answer:
      "Your Secret Santa can update the status of their gift (bought, shipped, delivered), but you won't see these updates - it would spoil the surprise! The gift giver uses this feature to keep track of their progress.",
  },
  {
    question: "What happens if someone doesn't accept their invitation?",
    answer:
      "Pending invitations are shown in the exchange overview. The admin can resend invitation emails if needed. You should wait until everyone has accepted before triggering the assignment, as pending members won't be included in the matching.",
  },
  {
    question: "Can I use Elf Match outside Christmas?",
    answer:
      "Yes. The exchange date is yours to set. The same flow works for an office draw, a family gathering, or any other occasion where people should not see the full list of pairings.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Yes, we take security seriously. All data is transmitted over HTTPS (encrypted). Delivery addresses are encrypted before being stored. We never share or sell your personal information. See our Privacy Policy for full details.",
  },
  {
    question: "How do I contact support?",
    answer:
      "You can reach us at hello@elfmatch.com for any questions, feedback, or issues. We typically respond within 24 hours.",
  },
];

export default function FAQPage() {
  // Generate FAQ Schema for SEO
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <PublicNav />

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-10 sm:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-cranberry">
          Questions
        </p>
        <h1 className="mt-3 font-display text-4xl text-evergreen sm:text-5xl">
          Before you send the invitations.
        </h1>
        <p className="mt-4 text-lg text-ink-soft">
          Budgets, who can see a wishlist, and what happens if someone has not
          joined yet.
        </p>

        <div className="mt-10">
          <FAQAccordion faqs={faqs} />
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-rule pt-8 sm:flex-row">
          <a
            href="mailto:hello@elfmatch.com"
            className="inline-flex items-center justify-center border border-evergreen/25 px-5 py-3 font-semibold text-evergreen hover:bg-evergreen-soft"
          >
            Write to hello@elfmatch.com
          </a>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center bg-cranberry px-5 py-3 font-semibold text-ivory hover:bg-cranberry-deep"
          >
            Create an exchange
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
