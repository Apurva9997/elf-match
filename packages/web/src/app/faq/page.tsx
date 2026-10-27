import { PublicNav } from "@/components/public-nav";
import { Metadata } from "next";
import Link from "next/link";
import { FAQAccordion } from "./faq-accordion";

export const metadata: Metadata = {
  title: "FAQ - Frequently Asked Questions About Secret Santa",
  description:
    "Get answers to common questions about organizing Secret Santa gift exchanges. Learn how to set up exchanges, invite participants, create wishlists, and more.",
  alternates: {
    canonical: "https://elfmatch.com/faq",
  },
  openGraph: {
    title: "Secret Santa FAQ - Common Questions Answered",
    description:
      "Everything you need to know about organizing a Secret Santa gift exchange with ElfMatch.",
  },
};

// FAQ data structured for SEO (can also be used for FAQ schema markup)
const faqs = [
  {
    question: "What is ElfMatch?",
    answer:
      "ElfMatch is a free online tool that helps you organize Secret Santa and gift exchange events. You can create exchanges, invite participants via email, build wishlists, set up exclusion rules (so couples don't get each other), and automatically match everyone with a random person to gift.",
  },
  {
    question: "Is ElfMatch really free?",
    answer:
      "Yes, ElfMatch is 100% free to use. There are no hidden fees, no premium tiers, and no credit card required. We believe organizing gift exchanges should be simple and accessible to everyone.",
  },
  {
    question: "How many people can join a Secret Santa exchange?",
    answer:
      "You need at least 3 people to create a Secret Santa exchange (otherwise there's no mystery!). There's no upper limit - ElfMatch can handle exchanges of any size, whether it's a small family gathering or a large office party.",
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
      "When you're ready to assign Secret Santas, click 'Assign Santas' and our algorithm will randomly match each participant with someone to gift. The algorithm ensures no one is assigned to themselves and respects all exclusion rules. Each person receives a private email revealing who they're gifting.",
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
    question: "Can I use ElfMatch for non-Christmas gift exchanges?",
    answer:
      "Of course! While 'Secret Santa' is traditionally associated with Christmas, ElfMatch works for any occasion - birthdays, Diwali, Hanukkah, office events, team building, or just for fun. Simply create an exchange and set your own date.",
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
      {/* FAQ Schema for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Navigation */}
      <PublicNav />

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-display font-bold text-cream mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-cream/70 text-lg">
              Everything you need to know about organizing your Secret Santa
              gift exchange
            </p>
          </div>

          <FAQAccordion faqs={faqs} />

          {/* CTA */}
          <div className="mt-16 text-center p-8 glass-card">
            <h2 className="text-2xl font-display font-semibold text-cream mb-4">
              Still have questions?
            </h2>
            <p className="text-cream/70 mb-6">
              Can&apos;t find what you&apos;re looking for? Reach out to us and
              we&apos;ll help you out.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:hello@elfmatch.com"
                className="px-6 py-3 border border-gold/30 text-cream rounded-lg hover:bg-gold/10 transition-colors"
              >
                Contact Support
              </a>
              <Link
                href="/auth/login"
                className="px-6 py-3 bg-gradient-gold text-midnight font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                Create Your Exchange
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-gold/10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="text-cream/50 hover:text-cream text-sm">
            ← Back to Home
          </Link>
          <div className="flex gap-6 text-sm">
            <Link
              href="/privacy"
              className="text-cream/50 hover:text-cream transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-cream/50 hover:text-cream transition-colors"
            >
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
