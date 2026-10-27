"use client";

import { cn } from "@/lib/utils";
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
    <div className="border-t border-rule">
      {faqs.map((faq, index) => {
        const open = openIndex === index;
        const panelId = `faq-panel-${index}`;
        const buttonId = `faq-button-${index}`;
        return (
          <div key={faq.question} className="border-b border-rule">
            <h2>
              <button
                id={buttonId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIndex(open ? null : index)}
                className="flex w-full items-start justify-between gap-4 py-4 text-left"
              >
                <span className="font-display text-xl text-ink">{faq.question}</span>
                <span className="mt-1 font-mono text-sm text-cranberry" aria-hidden>
                  {open ? "–" : "+"}
                </span>
              </button>
            </h2>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!open}
              className={cn("pb-5 pr-8", !open && "hidden")}
            >
              <p className="leading-relaxed text-ink-soft">{faq.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
