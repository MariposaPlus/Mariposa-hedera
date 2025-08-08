"use client";

import React, { useEffect, useRef, useState } from "react";

type AnimatedSectionProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

export default function AnimatedSection({ children, className = "", delay = 0, ...rest }: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => setVisible(true), delay);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`${className} ${visible ? "animate-fade-in-up" : "opacity-0 translate-y-4"}`}
      {...rest}
    >
      {children}
    </div>
  );
}


