"use client";

import React, { useMemo, useState } from "react";
import { Bot } from "lucide-react";

const orangeButton =
  "inline-flex items-center justify-center rounded-full bg-orange-500 px-5 py-3 text-white shadow-sm transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2";

type ParsedIntent = {
  intent: string;
  tokens?: string[];
  amount?: string;
  recipient?: string;
  notes?: string;
};

export default function TryPrompt() {
  const [prompt, setPrompt] = useState("");
  const [parsed, setParsed] = useState<ParsedIntent | null>(null);
  const [simulated, setSimulated] = useState<string | null>(null);

  const examplePrompts = useMemo(
    () => [
      "Send $50 in ETH to Alex",
      "Swap USDC for SOL",
      "When BTC ↑5% and USDC ≥ $500, swap $200 USDC → ETH",
    ],
    []
  );

  const simulateParse = (input: string): ParsedIntent => {
    const lower = input.toLowerCase();
    if (lower.startsWith("send")) {
      const amountMatch = input.match(/\$?([0-9]+(?:\.[0-9]+)?)\s*/i);
      const tokenMatch = input.match(/\b(ETH|HBAR|USDC|USDT|SOL|BTC|SEI)\b/i);
      const toMatch = input.match(/to\s+([A-Za-z0-9_\-\s']+)/i);
      return {
        intent: "transfer",
        amount: amountMatch?.[1] ? `$${amountMatch[1]}` : undefined,
        tokens: tokenMatch ? [tokenMatch[1].toUpperCase()] : undefined,
        recipient: toMatch?.[1]?.trim(),
        notes: "Simulated parse. Actual app uses LLM + router.",
      };
    }
    if (lower.startsWith("swap") || lower.includes("swap")) {
      const pair = input.match(/swap\s+([A-Za-z0-9]+)\s+(?:for|→|to)\s+([A-Za-z0-9]+)/i);
      const from = pair?.[1]?.toUpperCase();
      const to = pair?.[2]?.toUpperCase();
      return {
        intent: "swap",
        tokens: [from || "USDC", to || "SOL"],
        notes: "Simulated parse. Actual app uses LLM + router.",
      };
    }
    if (lower.includes("when") && (lower.includes("swap") || lower.includes("then"))) {
      return {
        intent: "pipeline",
        notes: "Simulated conditional strategy pipeline",
      };
    }
    return { intent: "unknown" };
  };

  const handleTryPrompt = (value?: string) => {
    const input = (value ?? prompt).trim();
    if (!input) return;
    const result = simulateParse(input);
    setParsed(result);
    if (result.intent === "transfer") {
      setSimulated(
        "We would prepare a secure non-custodial transfer flow with fee estimation, recipient verification, and confirmation."
      );
    } else if (result.intent === "swap") {
      setSimulated(
        "We would route your swap across best liquidity with slippage protection and confirm execution."
      );
    } else if (result.intent === "pipeline") {
      setSimulated(
        "We would create an automation pipeline (Trigger → Condition → Action) and start monitoring."
      );
    } else {
      setSimulated(
        "We would interpret your intent using our LLM-powered router and guide you to execution."
      );
    }
  };

  return (
    <div className="mt-8 rounded-2xl border border-orange-100 bg-white p-4 shadow-sm dark:border-orange-400/20 dark:bg-neutral-900">
      <div className="flex items-center gap-2 pb-3">
        <Bot className="h-4 w-4 text-orange-600" />
        <p className="text-sm font-medium">Try a Prompt</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Send $50 in ETH to Alex"
          className="flex-1 rounded-xl border border-orange-200/60 bg-white px-4 py-3 text-sm outline-none ring-0 transition placeholder:text-gray-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-200 dark:border-orange-400/20 dark:bg-neutral-950"
        />
        <button onClick={() => handleTryPrompt()} className={orangeButton}>
          Simulate
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
        {examplePrompts.map((ex) => (
          <button
            key={ex}
            onClick={() => {
              setPrompt(ex);
              handleTryPrompt(ex);
            }}
            className="rounded-full border border-orange-200/60 px-3 py-1 text-gray-600 transition hover:bg-orange-50 dark:border-orange-400/20 dark:text-neutral-300 dark:hover:bg-white/5"
          >
            {ex}
          </button>
        ))}
      </div>
      {(parsed || simulated) && (
        <div className="mt-4 grid gap-2 rounded-xl bg-orange-50 p-4 text-sm text-orange-900 ring-1 ring-orange-200 dark:bg-orange-400/10 dark:text-orange-200 dark:ring-orange-400/30">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Parsed Intent</span>
            <span className="text-xs text-orange-700/70">LLM-simulated</span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <span className="text-xs uppercase tracking-wide text-orange-700/80">Type</span>
              <div className="font-medium">{parsed?.intent ?? "unknown"}</div>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wide text-orange-700/80">Tokens</span>
              <div className="font-medium">{parsed?.tokens?.join(" → ") ?? "—"}</div>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wide text-orange-700/80">Amount</span>
              <div className="font-medium">{parsed?.amount ?? "—"}</div>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wide text-orange-700/80">Recipient</span>
              <div className="font-medium">{parsed?.recipient ?? "—"}</div>
            </div>
          </div>
          {simulated && <div className="pt-1 text-sm text-orange-800/90">{simulated}</div>}
        </div>
      )}
    </div>
  );
}


