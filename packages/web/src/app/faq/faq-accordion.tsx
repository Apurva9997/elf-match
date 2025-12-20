"use client";

import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface FAQ {
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  faqs: FAQ[];
}

export function FAQAccordion({ faqs }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-4">
      {faqs.map((faq, index) => (
        <div
          key={index}
          className="glass-card overflow-hidden transition-all duration-200"
        >
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="w-full px-6 py-4 flex items-center justify-between text-left"
          >
            <span className="font-semibold text-cream pr-4">{faq.question}</span>
            <ChevronDown
              className={cn(
                "w-5 h-5 text-gold transition-transform duration-200 flex-shrink-0",
                openIndex === index && "rotate-180"
              )}
            />
          </button>
          <div
            className={cn(
              "px-6 overflow-hidden transition-all duration-200",
              openIndex === index ? "pb-4 max-h-96" : "max-h-0"
            )}
          >
            <p className="text-cream/70 leading-relaxed">{faq.answer}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

