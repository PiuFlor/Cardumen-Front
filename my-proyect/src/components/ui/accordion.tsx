// components/ui/Accordion.tsx
import React, { useState } from 'react';

interface AccordionProps {
  children: React.ReactNode;
  className?: string;
}

interface AccordionItemProps {
  value: string;
  children: React.ReactNode;
}

interface AccordionTriggerProps {
  children: React.ReactNode;
  className?: string;
}

interface AccordionContentProps {
  children: React.ReactNode;
  className?: string;
}

export const Accordion = ({ children, className = '' }: AccordionProps) => {
  return <div className={`w-full ${className}`}>{children}</div>;
};

export const AccordionItem = ({ value, children }: AccordionItemProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (child.type === AccordionTrigger) {
            return React.cloneElement(child, { 
              onClick: () => setIsOpen(!isOpen),
              isOpen 
            } as any);
          }
          if (child.type === AccordionContent && !isOpen) {
            return null;
          }
        }
        return child;
      })}
    </div>
  );
};

export const AccordionTrigger = ({ 
  children, 
  className = '',
  onClick,
  isOpen
}: AccordionTriggerProps & { onClick?: () => void; isOpen?: boolean }) => {
  return (
    <button
      className={`flex w-full items-center justify-between py-4 font-medium transition-all hover:underline ${className}`}
      onClick={onClick}
    >
      {children}
      <svg
        className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
  );
};

export const AccordionContent = ({ children, className = '' }: AccordionContentProps) => {
  return (
    <div className={`pb-4 pt-0 ${className}`}>
      {children}
    </div>
  );
};