"use client";

import React from "react";
import Link from "next/link";
import CommandLine from "@/components/ui/CommandLine";
import Reveal from "@/components/ui/Reveal";

const SHARING = [
  {
    title: "Service providers",
    body: "We share data with trusted third-party vendors who assist us in operating our Services (e.g., payment processors, cloud hosting, analytics providers, email services).",
  },
  {
    title: "Legal requirements",
    body: "We may disclose information if required by law, court order, or government request, or to protect our rights, privacy, safety, or property.",
  },
  {
    title: "Business transfers",
    body: "In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.",
  },
  {
    title: "With your consent",
    body: "We may share your information for any other purpose with your explicit consent.",
  },
];

const COOKIES = [
  ["Essential", "Required for basic site functionality and security"],
  ["Analytics", "Help us understand how visitors interact with our Services"],
  ["Functional", "Remember your preferences and settings"],
  ["Marketing", "Used to deliver relevant advertisements (with consent)"],
];

export default function PrivacyPolicy() {
  const lastUpdated = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-night text-ivory">
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-14 md:py-20">
        <Reveal>
          <CommandLine cmd="PRV" note="how we handle your data" className="mb-4" />
          <h1 className="font-display text-ivory text-4xl md:text-6xl tracking-tight">
            Privacy <em className="italic text-gold-soft">policy</em>.
          </h1>
          <p className="mt-5 font-monodata text-[11px] uppercase tracking-widest text-gray-500">
            Last updated · {lastUpdated}
          </p>
        </Reveal>

        <Reveal delay={0.06}>
          <div className="prose-desk mt-12">
            <h2>1. Introduction</h2>
            <p>
              WallStreetStocks.ai ("Company," "we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website, mobile applications, and services (collectively, the "Services").
            </p>
            <p>
              Please read this Privacy Policy carefully. By using our Services, you consent to the practices described in this policy. If you do not agree with this Privacy Policy, please do not access or use our Services.
            </p>

            <h2>2. Information We Collect</h2>

            <h3>2.1 Information You Provide</h3>
            <p>We collect information you voluntarily provide when using our Services:</p>
            <ul>
              <li><strong>Account Information:</strong> Name, email address, username, password, and profile picture</li>
              <li><strong>Profile Information:</strong> Bio, location, website, and other optional profile details</li>
              <li><strong>Payment Information:</strong> Credit card details, billing address (processed securely through third-party payment processors)</li>
              <li><strong>Communication Data:</strong> Messages, feedback, support requests, and community posts</li>
              <li><strong>Portfolio Data:</strong> Stock symbols, watchlists, and investment preferences you choose to track</li>
            </ul>

            <h3>2.2 Information Collected Automatically</h3>
            <p>When you access our Services, we automatically collect:</p>
            <ul>
              <li><strong>Device Information:</strong> Device type, operating system, unique device identifiers, browser type</li>
              <li><strong>Usage Data:</strong> Pages visited, features used, time spent, click patterns, search queries</li>
              <li><strong>Location Data:</strong> General geographic location based on IP address</li>
              <li><strong>Log Data:</strong> IP address, access times, referring URLs, error logs</li>
            </ul>

            <h3>2.3 Cookies and Tracking Technologies</h3>
            <p>
              We use cookies, web beacons, and similar technologies to enhance your experience, analyze usage, and deliver personalized content. You can control cookie preferences through your browser settings, though disabling cookies may limit some functionality.
            </p>

            <h2>3. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul>
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

            <h2>4. How We Share Your Information</h2>
            <p>We may share your information in the following circumstances:</p>
            <div className="space-y-4">
              {SHARING.map((s) => (
                <div key={s.title} className="card-night p-5">
                  <h4 className="text-base font-semibold text-ivory">{s.title}</h4>
                  <p className="mt-2 text-[0.95rem]">{s.body}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-gold/30 bg-gold/10 p-6">
              <p className="font-monodata text-[11px] uppercase tracking-widest text-gold">
                We do not sell your personal information
              </p>
              <p className="mt-3">
                WallStreetStocks.ai does not sell, rent, or trade your personal information to third parties for their marketing purposes.
              </p>
            </div>

            <h2>5. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your information, including:
            </p>
            <ul>
              <li>Encryption of data in transit using SSL/TLS protocols</li>
              <li>Encryption of sensitive data at rest</li>
              <li>Secure authentication mechanisms</li>
              <li>Regular security assessments and monitoring</li>
              <li>Access controls limiting employee access to personal data</li>
            </ul>
            <p>
              However, no method of transmission or storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
            </p>

            <h2>6. Data Retention</h2>
            <p>
              We retain your personal information for as long as necessary to provide our Services, comply with legal obligations, resolve disputes, and enforce our agreements. When you delete your account, we will delete or anonymize your personal information within 90 days, except where retention is required by law.
            </p>

            <h2>7. Your Rights and Choices</h2>
            <p>Depending on your location, you may have the following rights:</p>
            <ul>
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
              <a href="mailto:wallstreetstocks@outlook.com">wallstreetstocks@outlook.com</a>. We will respond to your request within 30 days.
            </p>

            <h2>8. California Privacy Rights (CCPA)</h2>
            <p>
              If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA):
            </p>
            <ul>
              <li>Right to know what personal information is collected, used, shared, or sold</li>
              <li>Right to delete personal information (with certain exceptions)</li>
              <li>Right to opt-out of the sale of personal information (we do not sell your data)</li>
              <li>Right to non-discrimination for exercising your privacy rights</li>
            </ul>
            <p>
              To submit a CCPA request, email us at{" "}
              <a href="mailto:wallstreetstocks@outlook.com">wallstreetstocks@outlook.com</a>{" "}
              with "CCPA Request" in the subject line.
            </p>

            <h2>9. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your own, including the United States. These countries may have different data protection laws. By using our Services, you consent to the transfer of your information to these countries. We take appropriate safeguards to ensure your data is protected in accordance with this Privacy Policy.
            </p>

            <h2>10. Children's Privacy</h2>
            <p>
              Our Services are not intended for children under 18 years of age. We do not knowingly collect personal information from children. If we learn that we have collected information from a child under 18, we will delete that information promptly. If you believe we have collected information from a child, please contact us immediately.
            </p>

            <h2>11. Third-Party Links and Services</h2>
            <p>
              Our Services may contain links to third-party websites, applications, or services. This Privacy Policy does not apply to those third parties. We encourage you to review the privacy policies of any third-party services you access through our platform.
            </p>

            <h2>12. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on our website and updating the "Last Updated" date. We encourage you to review this Privacy Policy periodically. Your continued use of our Services after changes constitutes acceptance of the updated policy.
            </p>

            <h2>13. Contact Us</h2>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="card-night p-6">
              <p className="font-monodata text-[11px] uppercase tracking-widest text-gray-500">
                WallStreetStocks.ai
              </p>
              <p className="mt-2">
                Email: <a href="mailto:wallstreetstocks@outlook.com">wallstreetstocks@outlook.com</a>
              </p>
              <p className="mt-3 text-gray-400 text-[0.95rem]">
                For privacy-related inquiries, please include "Privacy Inquiry" in your email subject line.
              </p>
            </div>

            <h2>14. Cookie Policy</h2>
            <p>We use the following types of cookies:</p>
            <div className="card-night overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/[0.02]">
                    <tr>
                      <th>Cookie type</th>
                      <th>Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COOKIES.map(([type, purpose]) => (
                      <tr key={type} className="hover:bg-white/[0.03] transition-colors">
                        <td className="font-medium text-ivory whitespace-nowrap">{type}</td>
                        <td>{purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
