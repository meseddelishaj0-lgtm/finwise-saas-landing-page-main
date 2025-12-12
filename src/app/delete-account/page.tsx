"use client";

import React, { useState } from "react";
import Link from "next/link";

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
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0a0a0a] to-[#1a1a1a] text-gray-300">
      {/* Hero Section */}
      <div className="relative py-20 px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.08)_0%,rgba(0,0,0,1)_80%)] pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-yellow-400 drop-shadow-[0_0_15px_rgba(255,215,0,0.4)] mb-4">
            Delete Your Account
          </h1>
          <p className="text-gray-400 text-lg">
            Request permanent deletion of your WallStreetStocks.ai account
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 pb-20">
        <div className="space-y-8 text-gray-300 leading-relaxed">

          {/* Important Warning */}
          <section>
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
              <div className="flex items-start">
                <svg className="w-6 h-6 text-red-400 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="font-semibold text-red-400 mb-2">Warning: This action is permanent</p>
                  <p>
                    Deleting your account will permanently remove all your data from our systems. This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* What Gets Deleted */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">What Gets Deleted</h2>
            <p className="mb-4">
              When you delete your account, the following data will be permanently removed:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Account Information:</strong> Your email, username, password, and profile details</li>
              <li><strong>Portfolio Data:</strong> All watchlists, tracked stocks, and saved portfolios</li>
              <li><strong>Community Content:</strong> Posts, comments, and discussions you've created</li>
              <li><strong>Preferences:</strong> App settings, notification preferences, and customizations</li>
              <li><strong>Usage History:</strong> Activity logs and analytics associated with your account</li>
              <li><strong>Subscription Data:</strong> Subscription history and payment records (except where legally required)</li>
            </ul>
          </section>

          {/* What We Retain */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">What We May Retain</h2>
            <p className="mb-4">
              Some information may be retained for legal, security, or business purposes:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Transaction records as required by tax and financial regulations</li>
              <li>Communications related to legal matters or disputes</li>
              <li>Anonymized, aggregated data that cannot identify you personally</li>
              <li>Information required to prevent fraud or enforce our terms</li>
            </ul>
          </section>

          {/* Before You Delete */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">Before You Delete</h2>
            <div className="space-y-4">
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                <h4 className="font-semibold text-yellow-400 mb-2">Cancel Active Subscriptions</h4>
                <p>If you have an active subscription, please cancel it first through the app or your app store settings to avoid future charges.</p>
              </div>

              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                <h4 className="font-semibold text-yellow-400 mb-2">Export Your Data</h4>
                <p>Consider exporting any data you want to keep before requesting deletion. Once deleted, your data cannot be recovered.</p>
              </div>

              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                <h4 className="font-semibold text-yellow-400 mb-2">Consider Alternatives</h4>
                <p>If you're having issues with your account, please <a href="mailto:wallstreetstocks@outlook.com" className="text-yellow-400 hover:underline">contact our support team</a> first. We may be able to help resolve your concerns.</p>
              </div>
            </div>
          </section>

          {/* Deletion Timeline */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">Deletion Timeline</h2>
            <p className="mb-4">
              After we receive and verify your deletion request:
            </p>
            <div className="space-y-3">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-yellow-500/20 border border-yellow-500/50 flex items-center justify-center text-yellow-400 font-bold text-sm mr-4">1</div>
                <p><strong className="text-yellow-400">Within 24-48 hours:</strong> Your account will be deactivated and inaccessible</p>
              </div>
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-yellow-500/20 border border-yellow-500/50 flex items-center justify-center text-yellow-400 font-bold text-sm mr-4">2</div>
                <p><strong className="text-yellow-400">Within 30 days:</strong> Most personal data will be deleted from our active systems</p>
              </div>
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-yellow-500/20 border border-yellow-500/50 flex items-center justify-center text-yellow-400 font-bold text-sm mr-4">3</div>
                <p><strong className="text-yellow-400">Within 90 days:</strong> Data will be purged from backup systems</p>
              </div>
            </div>
          </section>

          {/* Deletion Request Form */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">Request Account Deletion</h2>

            {submitted ? (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
                <div className="flex items-start">
                  <svg className="w-6 h-6 text-green-400 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="font-semibold text-green-400 mb-2">Email Client Opened</p>
                    <p>
                      Your email client should have opened with a pre-filled deletion request. Please send the email to complete your request. If your email client didn't open, please send your deletion request directly to{" "}
                      <a href="mailto:wallstreetstocks@outlook.com" className="text-yellow-400 hover:underline">
                        wallstreetstocks@outlook.com
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    Account Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50"
                    placeholder="Enter the email associated with your account"
                  />
                </div>

                <div>
                  <label htmlFor="reason" className="block text-sm font-medium text-gray-300 mb-2">
                    Reason for Leaving (Optional)
                  </label>
                  <textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50"
                    placeholder="Help us improve by sharing why you're leaving"
                  />
                </div>

                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="confirm"
                    required
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-gray-600 text-yellow-500 focus:ring-yellow-500 bg-gray-800"
                  />
                  <label htmlFor="confirm" className="ml-3 text-sm text-gray-300">
                    I understand that deleting my account is permanent and all my data will be removed. I have cancelled any active subscriptions and exported any data I want to keep.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={!confirmed || !email}
                  className="w-full py-3 px-6 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-xl transition-colors"
                >
                  Request Account Deletion
                </button>
              </form>
            )}

            <p className="mt-4 text-sm text-gray-500">
              You can also submit your request by emailing{" "}
              <a href="mailto:wallstreetstocks@outlook.com" className="text-yellow-400 hover:underline">
                wallstreetstocks@outlook.com
              </a>{" "}
              with the subject line "Account Deletion Request" and the email address associated with your account.
            </p>
          </section>

          {/* Contact Section */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">Questions?</h2>
            <p className="mb-4">
              If you have any questions about the account deletion process or need assistance, please contact us:
            </p>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <p className="font-semibold text-yellow-400">WallStreetStocks.ai Support</p>
              <p className="mt-2">
                Email:{" "}
                <a href="mailto:wallstreetstocks@outlook.com" className="text-yellow-400 hover:underline">
                  wallstreetstocks@outlook.com
                </a>
              </p>
              <p className="mt-2 text-gray-400">
                We typically respond to requests within 24-48 business hours.
              </p>
            </div>
          </section>

          {/* Related Links */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">Related Policies</h2>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/privacy"
                className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-yellow-400 hover:bg-gray-800 transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-yellow-400 hover:bg-gray-800 transition-colors"
              >
                Terms and Conditions
              </Link>
            </div>
          </section>

          {/* Back Link */}
          <div className="pt-8 border-t border-yellow-500/20">
            <Link
              href="/"
              className="inline-flex items-center text-yellow-400 hover:text-yellow-300 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
