import { useState, useRef } from 'react';
import { Plus } from 'lucide-react';

interface FAQItemProps {
  question: string;
  answer: string;
}

export default function FAQItem({ question, answer }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className={`border border-rp-border rounded-xl bg-rp-card overflow-hidden transition-all duration-200 hover:bg-[#161616] ${isOpen ? 'border-l-2 border-l-rp-blue' : ''}`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-6 md:px-8 py-5 text-left"
      >
        <span className="text-white text-base font-medium pr-4">{question}</span>
        <span
          className={`flex-shrink-0 w-8 h-8 flex items-center justify-center border border-rp-border rounded-lg text-rp-text-muted transition-transform duration-300 ${isOpen ? 'rotate-45 border-rp-blue text-rp-blue' : ''}`}
        >
          <Plus size={18} />
        </span>
      </button>
      <div
        ref={contentRef}
        className="grid transition-all duration-300 ease-out"
        style={{
          gridTemplateRows: isOpen ? '1fr' : '0fr',
        }}
      >
        <div className="overflow-hidden">
          <div className="px-6 md:px-8 pb-5 text-sm text-rp-text-secondary leading-relaxed">
            {answer}
          </div>
        </div>
      </div>
    </div>
  );
}
