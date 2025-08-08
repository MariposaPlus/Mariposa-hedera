"use client";

import React, { useEffect, useState } from "react";
import { Bot, User, ArrowRight, CheckCircle2, Sparkles, RefreshCw } from "lucide-react";

type Item = {
  prompt: string;
  response: string;
  pill?: string;
  details?: string[];
};

type PromptResponseProps = {
  title: string;
  subtitle?: string;
  items: Item[];
  className?: string;
};

export default function PromptResponse({ title, subtitle, items, className = "" }: PromptResponseProps) {
  const [typingIdx, setTypingIdx] = useState<number | null>(null);
  const [showDetails, setShowDetails] = useState<boolean[]>(() => items.map(() => false));
  const [typedText, setTypedText] = useState<string[]>(() => items.map(() => ""));

  useEffect(() => {
    // Sequential typewriter for each agent response
    let i = 0;
    let interval: ReturnType<typeof setInterval> | null = null;
    let timeoutAfterItem: ReturnType<typeof setTimeout> | null = null;

    const typeItem = () => {
      setTypingIdx(i);
      const full = items[i].response || "";
      let pos = 0;
      interval = setInterval(() => {
        pos += 1;
        setTypedText((prev) => {
          const next = [...prev];
          next[i] = full.slice(0, pos);
          return next;
        });
        if (pos >= full.length) {
          if (interval) clearInterval(interval);
          setTypingIdx(null);
          timeoutAfterItem = setTimeout(() => {
            i += 1;
            if (i < items.length) {
              typeItem();
            }
          }, 400);
        }
      }, 16);
    };

    typeItem();

    return () => {
      if (interval) clearInterval(interval);
      if (timeoutAfterItem) clearTimeout(timeoutAfterItem);
    };
  }, [items]);

  return (
    <section className={`relative ${className}`}>
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-orange-500/5 via-transparent to-transparent" />

      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/60 bg-white/60 px-3 py-1 text-xs font-medium text-orange-700 shadow-sm backdrop-blur dark:border-orange-400/20 dark:bg-white/5">
            <Sparkles className="h-3.5 w-3.5" />
            Conversational showcase
          </div>
        </div>

        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-2 max-w-2xl text-gray-600 dark:text-neutral-300">{subtitle}</p>}

        <div className="mt-8 grid gap-4">
          {items.map((item, i) => (
            <div
              key={i}
              className="group relative rounded-2xl border border-orange-100 bg-white/90 p-4 shadow-sm ring-1 ring-orange-100/60 backdrop-blur transition hover:shadow-md dark:border-orange-400/20 dark:bg-neutral-900/80 animate-pop"
            >
              <div className="absolute inset-0 -z-10 rounded-2xl bg-[linear-gradient(110deg,rgba(255,255,255,0)_0%,rgba(255,255,255,.6)_40%,rgba(255,255,255,0)_60%)] bg-[length:200%_100%] opacity-0 transition group-hover:opacity-100 animate-shine" />
              {/* WAW ribbon */}
              <div className="pointer-events-none absolute -right-2 -top-2 rotate-3 select-none rounded bg-gradient-to-r from-orange-500 to-yellow-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white opacity-0 transition group-hover:opacity-100">Live</div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-500">You</div>
                  <div className="mt-1 text-sm">{item.prompt}</div>
                </div>
                {item.pill && (
                  <span className="ml-auto rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-400/20 dark:text-orange-300">
                    {item.pill}
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>Mariposa Agent</span>
                    {typingIdx === i && (
                      <span className="inline-flex items-center gap-1 text-orange-600">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" /> thinking
                        <span className="inline-flex items-center ml-1">
                          <span className="mx-0.5 h-1.5 w-1.5 rounded-full bg-orange-400 animate-dot" />
                          <span className="mx-0.5 h-1.5 w-1.5 rounded-full bg-orange-400 animate-dot [animation-delay:150ms]" />
                          <span className="mx-0.5 h-1.5 w-1.5 rounded-full bg-orange-400 animate-dot [animation-delay:300ms]" />
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm leading-relaxed text-gray-800 dark:text-neutral-200">
                    {typedText[i] || item.response}
                  </div>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 text-orange-500 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                Executed securely via agent automation
              </div>

              {item.details && item.details.length > 0 && (
                <div className="mt-3">
                  <button
                    onClick={() => setShowDetails((prev) => prev.map((v, idx) => (idx === i ? !v : v)))}
                    className="text-xs text-orange-700 underline decoration-dotted underline-offset-4 hover:text-orange-800"
                  >
                    {showDetails[i] ? 'Hide details' : 'Show details'}
                  </button>
                  {showDetails[i] && (
                    <ul className="mt-2 grid gap-1 text-xs text-gray-600 dark:text-neutral-300">
                      {item.details.map((d, k) => (
                        <li key={k} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


