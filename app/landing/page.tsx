import React from "react";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ArrowRight, Bot, CheckCircle2, LineChart, Lock, Mail, PlayCircle, Rocket, Shield, Sparkles, Zap } from "lucide-react";

import TryPrompt from "@/components/landing/TryPrompt";
import AnimatedSection from "@/components/landing/AnimatedSection";
import PromptResponse from "@/components/landing/PromptResponse";

export const metadata: Metadata = {
  title: "Mariposa – The Web3 Wallet Powered by Natural Language",
  description:
    "Hedera-native wallet automation. Create a secure non-custodial wallet with your email, then move HBAR and HTS tokens (USDT, USDC, SAUCE) with simple prompts. Agentic automation on Hedera with low fees and fast finality.",
  openGraph: {
    title: "Mariposa – The Web3 Wallet Powered by Natural Language",
    description:
      "Hedera-native wallet automation. Send HBAR, swap on SaucerSwap, and automate strategies with natural language.",
    url: "https://mariposa.app/landing",
    siteName: "Mariposa",
    images: [
      {
        url: "https://mariposa.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "Mariposa – The Web3 Wallet Powered by Natural Language",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mariposa – The Web3 Wallet Powered by Natural Language",
    description:
      "Hedera-native wallet automation. Send HBAR, swap on SaucerSwap, and automate strategies with natural language.",
    images: ["https://mariposa.app/og-image.png"],
  },
};

const orangeButton =
  "inline-flex items-center justify-center rounded-full bg-orange-500 px-5 py-3 text-white shadow-sm transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2";
const orangeLink = "text-orange-600 hover:text-orange-700";
const orangeDivider = "h-px w-full bg-gradient-to-r from-orange-500/20 via-orange-500 to-orange-500/20";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900 dark:bg-neutral-950 dark:text-neutral-100">
      {/* Header with section links */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-orange-100/60 bg-white/70 backdrop-blur dark:border-orange-400/10 dark:bg-neutral-900/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link href="#hero" className="flex items-center gap-2">
            <div className="relative h-16 w-16 overflow-hidden rounded-lg ring-1 ring-orange-300/50">
              <Image src="/images/logo.png" alt="Mariposa" fill sizes="200px" />
            </div>
          </Link>
          <nav className="hidden items-center gap-4 text-sm sm:flex">
            <Link href="#chat" className={orangeLink}>Chat</Link>
            <Link href="#how" className={orangeLink}>How it works</Link>
            <Link href="#automation" className={orangeLink}>Automation</Link>
            <Link href="#capabilities" className={orangeLink}>What you can do</Link>
            <Link href="#hedera" className={orangeLink}>Built on Hedera</Link>
            <Link href="#pricing" className={orangeLink}>Pricing</Link>
            <Link href="/dashboard" className={`${orangeButton} ml-2 px-4 py-2`}>Launch</Link>
          </nav>
        </div>
      </header>
      {/* Right rail scroll line */}
      <div className="pointer-events-none fixed right-4 top-24 bottom-24 hidden w-[2px] bg-gradient-to-b from-orange-200 via-orange-500 to-orange-200 opacity-60 sm:block" />
      {/* Schema.org Product */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: "Mariposa",
            description:
              "A non-custodial Web3 wallet powered by natural language and agentic automation.",
            brand: { "@type": "Brand", name: "Mariposa" },
            offers: {
              "@type": "AggregateOffer",
              priceCurrency: "USD",
              lowPrice: "0",
              highPrice: "9.99",
              offerCount: "2",
            },
          }),
        }}
      />

      {/* Hero */}
      <section id="hero" className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-orange-500/5 via-transparent to-transparent" />
        <div className="mx-auto max-w-7xl px-6 pt-24 pb-16 sm:pt-28">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/60 bg-white/60 px-3 py-1 text-xs font-medium text-orange-700 shadow-sm backdrop-blur dark:border-orange-400/20 dark:bg-white/5">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">M</span>
                Mariposa • Built on Hedera
              </div>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
                Mariposa: The Web3 Wallet Powered by Natural Language
              </h1>
              <p className="mt-4 text-lg text-gray-600 dark:text-neutral-300">
                Hedera‑native, non‑custodial wallet automation. Send HBAR and HTS tokens, swap on SaucerSwap, and automate strategies — with simple prompts.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link href="/dashboard" className={orangeButton}>
                  Create Your Wallet <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <a href="#demo" className="inline-flex items-center rounded-full px-5 py-3 text-orange-600 ring-1 ring-orange-300 transition hover:bg-orange-50 dark:text-orange-400 dark:ring-orange-400/40">
                  <PlayCircle className="mr-2 h-5 w-5" /> Watch Demo
                </a>
              </div>

              {/* Try a Prompt (client component) */}
              <TryPrompt />
            </div>

            {/* Visual Mock */}
            <div id="demo" className="relative">
              <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-xl ring-1 ring-orange-100/60 dark:border-orange-400/20 dark:bg-neutral-900 dark:ring-orange-400/20">
                <div className="mb-3 h-2 w-24 rounded-full bg-orange-100 dark:bg-orange-400/30" />
                <div className="space-y-3">
                  <div className="rounded-xl bg-neutral-50 p-4 shadow-sm ring-1 ring-orange-100/60 dark:bg-neutral-800">
                  <div className="text-xs text-gray-500">You</div>
                  <div className="mt-1 text-sm">Send 50 HBAR to Alex</div>
                  </div>
                  <div className="rounded-xl bg-neutral-50 p-4 shadow-sm ring-1 ring-orange-100/60 dark:bg-neutral-800">
                    <div className="text-xs text-gray-500">You</div>
                  <div className="mt-1 text-sm">Swap USDC → HBAR</div>
                  </div>
                  <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-orange-100/60 dark:bg-neutral-900">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Executed securely via agent automation
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={`mx-auto max-w-7xl px-6 ${orangeDivider}`} />
      </section>

      {/* Problem (animated) */}
      <AnimatedSection id="problem" className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="text-2xl font-bold">Web3’s Complexity Barrier</h2>
        <p className="mt-2 max-w-3xl text-gray-600 dark:text-neutral-300">
          Web3 adoption is hampered by complex seed phrases, manual and repetitive transactions, and confusing UX.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Lock, title: "Key management & seed phrases" },
            { icon: Zap, title: "Manual, repetitive transactions" },
            { icon: LineChart, title: "Low adoption due to complexity" },
          ].map(({ icon: Icon, title }, idx) => (
            <div
              key={title}
              className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-orange-400/20 dark:bg-neutral-900 animate-fade-in-up"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <Icon className="h-5 w-5 text-orange-600" />
              <h3 className="mt-3 font-semibold">{title}</h3>
            </div>
          ))}
        </div>
      </AnimatedSection>

      {/* Solution (prompt + response showcase) */}
      <AnimatedSection id="chat" className="mx-auto max-w-7xl px-6 pb-16" delay={80}>
        <PromptResponse
          title="Transforming Web3 Interaction"
          subtitle="Why Mariposa? Ask anything. Get secure execution with clarity and speed."
          items={[
            {
              prompt: "Why Mariposa over other wallets?",
              response:
                "Mariposa turns natural language into secure, non‑custodial execution. It routes best prices, handles fees and approvals, and keeps you in control.",
              pill: "Why Mariposa",
              details: [
                "Non‑custodial: Your keys, protected by MPC",
                "Natural language → on‑chain actions",
                "Best‑route execution & slippage guard",
                "Receipts, audit trail, and notifications",
              ],
            },
            {
              prompt: "Show me a quick transfer",
              response:
                "I'll transfer 25 HBAR to Sarah’s saved address with memo ‘Thanks!’. Estimated fee: ~0.001 HBAR. You’ll get a confirmation and transaction link.",
              pill: "Transfer",
              details: [
                "Recipient: Sarah (0.0.123… masked)",
                "Network: Hedera mainnet",
                "Fee estimate: 0.001 HBAR",
                "Security: Non‑custodial + policy checks",
              ],
            },
            {
              prompt: "Can you optimize a swap?",
              response:
                "I’ll route your $50 USDC → HBAR swap across the best pool. Estimated receive: ~187.3 HBAR with 0.5% slippage tolerance. Executing and monitoring now.",
              pill: "Swap",
              details: [
                "Router: Best route (multi‑pool)",
                "Slippage tolerance: 0.5%",
                "Gas & approvals handled",
                "Post‑trade report with txn link",
              ],
            },
          ]}
        />
      </AnimatedSection>

      {/* How it works (animated cards) */}
      <AnimatedSection id="how" className="mx-auto max-w-7xl px-6 pb-16" delay={120}>
        <h2 className="text-2xl font-bold">How it works</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {[
            {
              icon: Mail,
              title: "Create",
              desc: "Email → code → wallet ready. MPC secures keys.",
            },
            {
              icon: Sparkles,
              title: "Prompt",
              desc: "Say ‘send HBAR to my friend’. We handle gas & routing.",
            },
            {
              icon: LineChart,
              title: "Strategize",
              desc: "Chat goals; define triggers & actions.",
            },
            {
              icon: Rocket,
              title: "Autopilot",
              desc: "Agent monitors, executes, reports, optimizes.",
            },
          ].map(({ icon: Icon, title, desc }, idx) => (
            <div
              key={title}
              className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm dark:border-orange-400/20 dark:bg-neutral-900 animate-fade-in-up"
              style={{ animationDelay: `${idx * 90}ms` }}
            >
              <Icon className="h-5 w-5 text-orange-600" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-neutral-300">{desc}</p>
            </div>
          ))}
        </div>
      </AnimatedSection>

      {/* Automation pipelines (chat-like) */}
      <AnimatedSection id="automation" className="mx-auto max-w-7xl px-6 pb-16" delay={160}>
        <h2 className="text-2xl font-bold">Automation pipelines (Trigger → Condition → Action)</h2>
        <PromptResponse
          title="Automation in action"
          subtitle="Define triggers and conditions in natural language. We execute and report."
          items={[
            {
              prompt: "When HBAR falls 3% in 24h, buy $20 HBAR",
              response:
                "Automation scheduled. I'll watch HBAR change and place a market order for ~$20 HBAR when the threshold hits. You'll get a receipt instantly.",
              pill: "Trigger",
              details: [
                "Trigger window: 24h price change",
                "Order type: Market (best execution)",
                "Safety: Slippage guard & balance checks",
                "Audit trail with timestamp",
              ],
            },
            {
              prompt: "If my USDC balance ≥ $500, sweep $50 to BTC weekly",
              response:
                "Done. A weekly sweep is set with your condition. Every execution will include price, slippage, and a link to the transaction.",
              pill: "Condition",
              details: [
                "Schedule: Weekly (Sunday 09:00 UTC)",
                "Balance gate: USDC ≥ $500",
                "Execution: Lowest-fee route",
                "Reporting: Email summary with KPIs",
              ],
            },
          ]}
        />
      </AnimatedSection>

      {/* Removed Market & audience per request */}

      {/* Comparison table */}
      <section id="capabilities" className="mx-auto max-w-7xl px-6 pb-16">
        <h2 className="text-2xl font-bold">What you can do on Mariposa</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { title: 'Send & request', desc: 'Send HBAR, USDC, USDT with prompts. Add memos, saved contacts, and confirmations.' },
            { title: 'Swap & route', desc: 'Best price routing on SaucerSwap with slippage guard and receipts.' },
            { title: 'Automate', desc: 'Create rules: triggers, conditions, and actions for repeatable strategies.' },
          ].map(({ title, desc }) => (
            <div key={title} className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm dark:border-orange-400/20 dark:bg-neutral-900">
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-neutral-300">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Removed Why we’re the best per request */}

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-7xl px-6 pb-16">
        <h2 className="text-2xl font-bold">Pricing</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm dark:border-orange-400/20 dark:bg-neutral-900">
            <h3 className="text-lg font-semibold">Freemium</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-neutral-300">Free wallet + limited simple strategies.</p>
            <div className="mt-4 text-3xl font-extrabold">$0</div>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-orange-600" /> Email wallet</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-orange-600" /> Basic NL commands</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-orange-600" /> Limited pipelines</li>
            </ul>
            <Link href="/auth" className={`${orangeButton} mt-6 w-full`}>Get Started</Link>
          </div>
          <div className="rounded-2xl border-2 border-orange-500 bg-white p-6 shadow-md dark:border-orange-400 dark:bg-neutral-900">
            <div className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-400/20 dark:text-orange-300">Popular</div>
            <h3 className="mt-2 text-lg font-semibold">Premium</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-neutral-300">Unlimited pipelines, priority execution.</p>
            <div className="mt-4 text-3xl font-extrabold">$9.99<span className="text-sm font-medium text-gray-500">/mo</span></div>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-orange-600" /> Unlimited automation</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-orange-600" /> Priority routing</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-orange-600" /> Advanced strategies</li>
            </ul>
            <Link href="/auth" className={`${orangeButton} mt-6 w-full`}>Upgrade</Link>
            <p className="mt-3 text-xs text-gray-500">Fees: 1% on complex strategy executions; rev‑share with dApps; enterprise licensing.</p>
          </div>
        </div>
      </section>

      {/* Go-to-market */}
      <section id="hedera" className="mx-auto max-w-7xl px-6 pb-16">
        <h2 className="text-2xl font-bold">Built on Hedera</h2>
        <p className="mt-2 max-w-3xl text-gray-600 dark:text-neutral-300">Fast finality, low fees, and enterprise‑grade security. Mariposa is built for HBAR and Hedera Token Service (USDC, USDT, SAUCE).</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { title: "HBAR native", desc: "Send, receive, and automate HBAR with smart safeguards." },
            { title: "SaucerSwap", desc: "Best‑route swaps and strategy automation for SAUCE and pairs." },
            { title: "Stablecoins", desc: "USDC/USDT payments and automated sweeps with triggers." },
          ].map(({ title, desc }) => (
            <div key={title} className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm dark:border-orange-400/20 dark:bg-neutral-900">
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-neutral-300">{desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {['HBAR', 'SAUCE', 'USDC', 'USDT'].map((t) => (
            <span key={t} className="rounded-full border border-orange-200/60 bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700 dark:border-orange-400/20 dark:bg-orange-400/10 dark:text-orange-300">{t}</span>
          ))}
        </div>
      </section>

      {/* Removed Roadmap per request */}

      {/* Removed Growth trajectory per request */}

      {/* Final CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="rounded-3xl border border-orange-200 bg-gradient-to-br from-white to-orange-50 p-8 shadow-sm dark:border-orange-400/20 dark:from-neutral-950 dark:to-orange-900/10">
          <h2 className="text-2xl font-bold">Join the Mariposa Revolution</h2>
          <p className="mt-2 max-w-3xl text-gray-600 dark:text-neutral-300">
            “Prompt your wallet. Automate your strategy. Own your assets.”
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href="/auth" className={orangeButton}>
              Create Your Wallet <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center rounded-full px-5 py-3 text-orange-600 ring-1 ring-orange-300 transition hover:bg-orange-50 dark:text-orange-400 dark:ring-orange-400/40"
            >
              Talk to Sales
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-orange-100 bg-white py-10 text-sm dark:border-orange-400/20 dark:bg-neutral-950">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white shadow">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-semibold">Mariposa</span>
          </div>
          <nav className="flex flex-wrap items-center gap-4">
            <Link href="/docs" className={orangeLink}>Docs</Link>
            <Link href="/security" className={orangeLink}>Security</Link>
            <Link href="/pricing" className={orangeLink}>Pricing</Link>
            <Link href="/careers" className={orangeLink}>Careers</Link>
            <a href="mailto:investors@mariposa.io" className={orangeLink}>Contact</a>
          </nav>
        </div>
      </footer>
    </main>
  );
}


