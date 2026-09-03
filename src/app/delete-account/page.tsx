"use client";

import React, { useState } from "react";
import Link from "next/link";
import CommandLine from "@/components/ui/CommandLine";
import Reveal from "@/components/ui/Reveal";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-ivory placeholder:text-gray-600 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/25";

const labelClass = "block font-monodata text-[11px] uppercase tracking-widest text-gray-500 mb-2";

const TIMELINE = [
  { idx: "01", when: "Within 24-48 hours:", what: "Your account will be deactivated and inaccessible" },
  { idx: "02", when: "Within 30 days:", what: "Most personal data will be deleted from our active systems" },
  { idx: "03", when: "Within 90 days:", what: "Data will be purged from backup systems" },
];

export default function DeleteAccount() {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Open email client with pre-filled deletion request
    const subject = encodeURIComponent("Account Deletion Request");
    const body = encodeURIComponent(
      `Account Deletion Request\n\n` +
      `Email: ${email}\n` +
      `Reason for deletion: ${reason || "Not specified"}\n\n` +
      `I confirm that I want to permanently delete my WallStreetStocks.ai account and all associated data.`
    );

    window.location.href = `mailto:wallstreetstocks@outlook.com?subject=${subject}&body=${body}`;
    setSubmitted(true);
  };

  return (
    <main className="min-h-screen bg-night text-ivory">
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-14 md:py-20">
        <Reveal>
          <CommandLine cmd="DEL" note="request account deletion" className="mb-4" />
          <h1 className="font-display text-ivory text-4xl md:text-6xl tracking-tight">
            Delete your <em className="italic text-gold-soft">account</em>.
          </h1>
          <p className="mt-5 text-lg text-gray-300 max-w-2xl">
            Request permanent deletion of your WallStreetStocks.ai account and
            the data attached to it.
          </p>
        </Reveal>

        <Reveal delay={0.06}>
          <div className="prose-desk mt-12">
            <div className="rounded-xl border border-gold/30 bg-gold/10 p-6">
              <p className="font-monodata text-[11px] uppercase tracking-widest text-gold">
                Warning · this action is permanent
              </p>
              <p className="mt-3">
                Deleting your account will permanently remove all your data from our systems. This action cannot be undone.
              </p>
            </div>

            <h2>What gets deleted</h2>
            <p>When you delete your account, the following data will be permanently removed:</p>
            <ul>
              <li><strong>Account Information:</strong> Your email, username, password, and profile details</li>
              <li><strong>Portfolio Data:</strong> All watchlists, tracked stocks, and saved portfolios</li>
              <li><strong>Community Content:</strong> Posts, comments, and discussions you've created</li>
              <li><strong>Preferences:</strong> App settings, notification preferences, and customizations</li>
              <li><strong>Usage History:</strong> Activity logs and analytics associated with your account</li>
              <li><strong>Subscription Data:</strong> Subscription history and payment records (except where legally required)</li>
            </ul>

            <h2>What we may retain</h2>
            <p>Some information may be retained for legal, security, or business purposes:</p>
            <ul>
              <li>Transaction records as required by tax and financial regulations</li>
              <li>Communications related to legal matters or disputes</li>
              <li>Anonymized, aggregated data that cannot identify you personally</li>
              <li>Information required to prevent fraud or enforce our terms</li>
            </ul>

            <h2>Before you delete</h2>
            <div className="space-y-4">
              <div className="card-night p-5">
                <h4 className="text-base font-semibold text-ivory">Cancel active subscriptions</h4>
                <p className="mt-2 text-[0.95rem]">If you have an active subscription, please cancel it first through the app or your app store settings to avoid future charges.</p>
              </div>
              <div className="card-night p-5">
                <h4 className="text-base font-semibold text-ivory">Export your data</h4>
                <p className="mt-2 text-[0.95rem]">Consider exporting any data you want to keep before requesting deletion. Once deleted, your data cannot be recovered.</p>
              </div>
              <div className="card-night p-5">
                <h4 className="text-base font-semibold text-ivory">Consider alternatives</h4>
                <p className="mt-2 text-[0.95rem]">If you're having issues with your account, please <a href="mailto:wallstreetstocks@outlook.com">contact our support team</a> first. We may be able to help resolve your concerns.</p>
              </div>
            </div>

            <h2>Deletion timeline</h2>
            <p>After we receive and verify your deletion request:</p>
            <div className="space-y-3">
              {TIMELINE.map((step) => (
                <div key={step.idx} className="flex items-start gap-4">
                  <span className="mt-1.5 w-6 shrink-0 font-monodata tabular-nums text-[11px] tracking-widest text-gold">
                    {step.idx}
                  </span>
                  <p>
                    <strong>{step.when}</strong> {step.what}
                  </p>
                </div>
              ))}
            </div>

            <h2>Request account deletion</h2>
          </div>
        </Reveal>

        <Reveal delay={0.12} className="mt-6 max-w-[68ch]">
          {submitted ? (
            <div className="card-night p-6">
              <p className="font-monodata text-[11px] uppercase tracking-widest text-gold">
                Email client opened
              </p>
              <p className="mt-3 text-gray-300 leading-relaxed">
                Your email client should have opened with a pre-filled deletion request. Please send the email to complete your request. If your email client didn't open, please send your deletion request directly to{" "}
                <a href="mailto:wallstreetstocks@outlook.com" className="text-gold underline underline-offset-4 decoration-gold/40 hover:decoration-gold">
                  wallstreetstocks@outlook.com
                </a>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="card-night p-6 md:p-8 space-y-6">
              <div>
                <label htmlFor="email" className={labelClass}>
                  Account email address
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="The email on your account"
                />
              </div>

              <div>
                <label htmlFor="reason" className={labelClass}>
                  Reason for leaving (optional)
                </label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className={inputClass}
                  placeholder="Help us improve by sharing why you're leaving"
                />
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="confirm"
                  required
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-white/20 bg-white/10 accent-gold focus:outline-none focus:ring-2 focus:ring-gold/25"
                />
                <label htmlFor="confirm" className="text-sm text-gray-300 leading-relaxed">
                  I understand that deleting my account is permanent and all my data will be removed. I have cancelled any active subscriptions and exported any data I want to keep.
                </label>
              </div>

              <button
                type="submit"
                disabled={!confirmed || !email}
                className="btn-gold w-full px-5 py-2.5 text-sm disabled:opacity-40 disabled:pointer-events-none"
              >
                Request account deletion
              </button>
            </form>
          )}

          <p className="mt-4 text-sm text-gray-500 leading-relaxed">
            You can also submit your request by emailing{" "}
            <a href="mailto:wallstreetstocks@outlook.com" className="text-gold underline underline-offset-4 decoration-gold/40 hover:decoration-gold">
              wallstreetstocks@outlook.com
            </a>{" "}
            with the subject line "Account Deletion Request" and the email address associated with your account.
          </p>
        </Reveal>

        <Reveal delay={0.18}>
          <div className="prose-desk mt-6">
            <h2>Questions?</h2>
            <p>
              If you have any questions about the account deletion process or need assistance, please contact us:
            </p>
            <div className="card-night p-6">
              <p className="font-monodata text-[11px] uppercase tracking-widest text-gray-500">
                WallStreetStocks.ai support
              </p>
              <p className="mt-2">
                Email: <a href="mailto:wallstreetstocks@outlook.com">wallstreetstocks@outlook.com</a>
              </p>
              <p className="mt-3 text-gray-400 text-[0.95rem]">
                We typically respond to requests within 24-48 business hours.
              </p>
            </div>

            <h2>Related policies</h2>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/privacy" className="btn-ghost-gold px-4 py-2 text-sm">
              Privacy policy
            </Link>
            <Link href="/terms" className="btn-ghost-gold px-4 py-2 text-sm">
              Terms and conditions
            </Link>
          </div>
        </Reveal>

        <div className="mt-14 pt-8 border-t border-white/10">
          <Link href="/" className="btn-ghost-gold px-4 py-2 text-sm">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
