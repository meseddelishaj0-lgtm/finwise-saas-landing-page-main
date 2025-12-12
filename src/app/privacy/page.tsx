"use client";

import React from "react";
import Link from "next/link";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0a0a0a] to-[#1a1a1a] text-gray-300">
      {/* Hero Section */}
      <div className="relative py-20 px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.08)_0%,rgba(0,0,0,1)_80%)] pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-yellow-400 drop-shadow-[0_0_15px_rgba(255,215,0,0.4)] mb-4">
            Privacy Policy
          </h1>
          <p className="text-gray-400 text-lg">
            Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 pb-20">
        <div className="space-y-8 text-gray-300 leading-relaxed">

          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">1. Introduction</h2>
            <p className="mb-4">
              WallStreetStocks.ai ("Company," "we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website, mobile applications, and services (collectively, the "Services").
            </p>
            <p>
              Please read this Privacy Policy carefully. By using our Services, you consent to the practices described in this policy. If you do not agree with this Privacy Policy, please do not access or use our Services.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">2. Information We Collect</h2>

            <h3 className="text-xl font-semibold text-yellow-300 mb-3">2.1 Information You Provide</h3>
            <p className="mb-4">We collect information you voluntarily provide when using our Services:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-6">
              <li><strong>Account Information:</strong> Name, email address, username, password, and profile picture</li>
              <li><strong>Profile Information:</strong> Bio, location, website, and other optional profile details</li>
              <li><strong>Payment Information:</strong> Credit card details, billing address (processed securely through third-party payment processors)</li>
              <li><strong>Communication Data:</strong> Messages, feedback, support requests, and community posts</li>
              <li><strong>Portfolio Data:</strong> Stock symbols, watchlists, and investment preferences you choose to track</li>
            </ul>

            <h3 className="text-xl font-semibold text-yellow-300 mb-3">2.2 Information Collected Automatically</h3>
            <p className="mb-4">When you access our Services, we automatically collect:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-6">
              <li><strong>Device Information:</strong> Device type, operating system, unique device identifiers, browser type</li>
              <li><strong>Usage Data:</strong> Pages visited, features used, time spent, click patterns, search queries</li>
              <li><strong>Location Data:</strong> General geographic location based on IP address</li>
              <li><strong>Log Data:</strong> IP address, access times, referring URLs, error logs</li>
            </ul>

            <h3 className="text-xl font-semibold text-yellow-300 mb-3">2.3 Cookies and Tracking Technologies</h3>
            <p>
              We use cookies, web beacons, and similar technologies to enhance your experience, analyze usage, and deliver personalized content. You can control cookie preferences through your browser settings, though disabling cookies may limit some functionality.
            </p>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">3. How We Use Your Information</h2>
            <p className="mb-4">We use your information to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide, maintain, and improve our Services</li>
              <li>Create and manage your account</li>
              <li>Process payments and subscriptions</li>
              <li>Personalize your experience and deliver relevant content</li>
              <li>Send transactional emails (account verification, password resets, subscription updates)</li>
              <li>Send marketing communications (with your consent)</li>
              <li>Respond to customer support inquiries</li>
              <li>Monitor and analyze usage patterns and trends</li>
              <li>Detect, prevent, and address technical issues and security threats</li>
              <li>Comply with legal obligations</li>
              <li>Enforce our Terms and Conditions</li>
            </ul>
          </section>

          {/* Information Sharing */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">4. How We Share Your Information</h2>
            <p className="mb-4">We may share your information in the following circumstances:</p>

            <div className="space-y-4">
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                <h4 className="font-semibold text-yellow-400 mb-2">Service Providers</h4>
                <p>We share data with trusted third-party vendors who assist us in operating our Services (e.g., payment processors, cloud hosting, analytics providers, email services).</p>
              </div>

              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                <h4 className="font-semibold text-yellow-400 mb-2">Legal Requirements</h4>
                <p>We may disclose information if required by law, court order, or government request, or to protect our rights, privacy, safety, or property.</p>
              </div>

              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                <h4 className="font-semibold text-yellow-400 mb-2">Business Transfers</h4>
                <p>In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.</p>
              </div>

              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                <h4 className="font-semibold text-yellow-400 mb-2">With Your Consent</h4>
                <p>We may share your information for any other purpose with your explicit consent.</p>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 mt-6">
              <p className="font-semibold text-yellow-400 mb-2">We Do NOT Sell Your Personal Information</p>
              <p>WallStreetStocks.ai does not sell, rent, or trade your personal information to third parties for their marketing purposes.</p>
            </div>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">5. Data Security</h2>
            <p className="mb-4">
              We implement industry-standard security measures to protect your information, including:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Encryption of data in transit using SSL/TLS protocols</li>
              <li>Encryption of sensitive data at rest</li>
              <li>Secure authentication mechanisms</li>
              <li>Regular security assessments and monitoring</li>
              <li>Access controls limiting employee access to personal data</li>
            </ul>
            <p className="mt-4">
              However, no method of transmission or storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">6. Data Retention</h2>
            <p>
              We retain your personal information for as long as necessary to provide our Services, comply with legal obligations, resolve disputes, and enforce our agreements. When you delete your account, we will delete or anonymize your personal information within 90 days, except where retention is required by law.
            </p>
          </section>

          {/* Your Rights and Choices */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">7. Your Rights and Choices</h2>
            <p className="mb-4">Depending on your location, you may have the following rights:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-6">
              <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal information</li>
              <li><strong>Portability:</strong> Request a portable copy of your data</li>
              <li><strong>Opt-Out:</strong> Opt out of marketing communications at any time</li>
              <li><strong>Restriction:</strong> Request restriction of processing in certain circumstances</li>
              <li><strong>Objection:</strong> Object to processing based on legitimate interests</li>
            </ul>
            <p>
              To exercise these rights, contact us at{" "}
              <a href="mailto:wallstreetstocks@outlook.com" className="text-yellow-400 hover:underline">
                wallstreetstocks@outlook.com
              </a>
              . We will respond to your request within 30 days.
            </p>
          </section>

          {/* California Privacy Rights */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">8. California Privacy Rights (CCPA)</h2>
            <p className="mb-4">
              If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA):
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Right to know what personal information is collected, used, shared, or sold</li>
              <li>Right to delete personal information (with certain exceptions)</li>
              <li>Right to opt-out of the sale of personal information (we do not sell your data)</li>
              <li>Right to non-discrimination for exercising your privacy rights</li>
            </ul>
            <p className="mt-4">
              To submit a CCPA request, email us at{" "}
              <a href="mailto:wallstreetstocks@outlook.com" className="text-yellow-400 hover:underline">
                wallstreetstocks@outlook.com
              </a>{" "}
              with "CCPA Request" in the subject line.
            </p>
          </section>

          {/* International Data Transfers */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">9. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your own, including the United States. These countries may have different data protection laws. By using our Services, you consent to the transfer of your information to these countries. We take appropriate safeguards to ensure your data is protected in accordance with this Privacy Policy.
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">10. Children's Privacy</h2>
            <p>
              Our Services are not intended for children under 18 years of age. We do not knowingly collect personal information from children. If we learn that we have collected information from a child under 18, we will delete that information promptly. If you believe we have collected information from a child, please contact us immediately.
            </p>
          </section>

          {/* Third-Party Links */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">11. Third-Party Links and Services</h2>
            <p>
              Our Services may contain links to third-party websites, applications, or services. This Privacy Policy does not apply to those third parties. We encourage you to review the privacy policies of any third-party services you access through our platform.
            </p>
          </section>

          {/* Changes to Privacy Policy */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">12. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on our website and updating the "Last Updated" date. We encourage you to review this Privacy Policy periodically. Your continued use of our Services after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* Contact Information */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">13. Contact Us</h2>
            <p className="mb-4">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <p className="font-semibold text-yellow-400">WallStreetStocks.ai</p>
              <p className="mt-2">
                Email:{" "}
                <a href="mailto:wallstreetstocks@outlook.com" className="text-yellow-400 hover:underline">
                  wallstreetstocks@outlook.com
                </a>
              </p>
              <p className="mt-4 text-gray-400">
                For privacy-related inquiries, please include "Privacy Inquiry" in your email subject line.
              </p>
            </div>
          </section>

          {/* Cookie Policy Summary */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">14. Cookie Policy</h2>
            <p className="mb-4">We use the following types of cookies:</p>
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-700 rounded-xl overflow-hidden">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-yellow-400 font-semibold">Cookie Type</th>
                    <th className="px-4 py-3 text-left text-yellow-400 font-semibold">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  <tr className="bg-gray-900/50">
                    <td className="px-4 py-3 font-medium">Essential</td>
                    <td className="px-4 py-3">Required for basic site functionality and security</td>
                  </tr>
                  <tr className="bg-gray-800/50">
                    <td className="px-4 py-3 font-medium">Analytics</td>
                    <td className="px-4 py-3">Help us understand how visitors interact with our Services</td>
                  </tr>
                  <tr className="bg-gray-900/50">
                    <td className="px-4 py-3 font-medium">Functional</td>
                    <td className="px-4 py-3">Remember your preferences and settings</td>
                  </tr>
                  <tr className="bg-gray-800/50">
                    <td className="px-4 py-3 font-medium">Marketing</td>
                    <td className="px-4 py-3">Used to deliver relevant advertisements (with consent)</td>
                  </tr>
                </tbody>
              </table>
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
