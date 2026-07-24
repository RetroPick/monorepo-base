import { useState } from "react";
import { Plus } from "lucide-react";

interface FAQItemProps {
  question: string;
  answer: string;
}

export default function FAQItem({ question, answer }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className={`overflow-hidden rounded-xl border border-rp-border bg-rp-card transition-all duration-200 hover:bg-[#161616] ${isOpen ? "border-l-2 border-l-rp-blue" : ""}`}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-6 py-5 text-left md:px-8"
      >
        <span className="pr-4 text-base font-medium text-white">{question}</span>
        <span
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-rp-border text-rp-text-muted transition-transform duration-300 ${isOpen ? "rotate-45 border-rp-blue text-rp-blue" : ""}`}
        >
          <Plus size={18} />
        </span>
      </button>
      <div
        className="grid transition-all duration-300 ease-out"
        style={{
          gridTemplateRows: isOpen ? "1fr" : "0fr",
        }}
      >
        <div className="overflow-hidden">
          <div className="px-6 pb-5 text-sm leading-relaxed text-rp-text-secondary md:px-8">
            {answer}
          </div>
        </div>
      </div>
    </div>
  );
}
