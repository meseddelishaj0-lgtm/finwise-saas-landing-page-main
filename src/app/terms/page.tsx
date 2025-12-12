"use client";

import React from "react";
import Link from "next/link";

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0a0a0a] to-[#1a1a1a] text-gray-300">
      {/* Hero Section */}
      <div className="relative py-20 px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.08)_0%,rgba(0,0,0,1)_80%)] pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-yellow-400 drop-shadow-[0_0_15px_rgba(255,215,0,0.4)] mb-4">
            Terms and Conditions
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
            <p>
              Welcome to WallStreetStocks.ai ("Company," "we," "our," or "us"). These Terms and Conditions ("Terms") govern your access to and use of our website, mobile applications, and services (collectively, the "Services"). By accessing or using our Services, you agree to be bound by these Terms. If you do not agree to these Terms, please do not use our Services.
            </p>
          </section>

          {/* Acceptance of Terms */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">2. Acceptance of Terms</h2>
            <p>
              By creating an account, accessing, or using our Services, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. You must be at least 18 years old to use our Services. If you are using our Services on behalf of an organization, you represent and warrant that you have the authority to bind that organization to these Terms.
            </p>
          </section>

          {/* Description of Services */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">3. Description of Services</h2>
            <p className="mb-4">
              WallStreetStocks.ai provides AI-powered financial research, analytics, and educational tools. Our Services include but are not limited to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>AI-driven stock analysis and ratings</li>
              <li>Market research reports and insights</li>
              <li>Portfolio tracking and analytics tools</li>
              <li>Educational financial resources</li>
              <li>Community discussion features</li>
              <li>Real-time market data visualization</li>
            </ul>
          </section>

          {/* Important Disclaimers */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">4. Important Disclaimers</h2>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 mb-4">
              <p className="font-semibold text-yellow-400 mb-2">NOT INVESTMENT ADVICE</p>
              <p>
                The information provided through our Services is for educational and informational purposes only and does not constitute investment advice, financial advice, trading advice, or any other sort of advice. You should not treat any of the content as such.
              </p>
            </div>
            <p className="mb-4">
              WallStreetStocks.ai does not recommend that any security, portfolio of securities, transaction, or investment strategy is suitable for any specific person. You understand that:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>We are not registered as a broker-dealer, investment advisor, or financial planner with the SEC, FINRA, or any other regulatory body</li>
              <li>Our AI-generated insights are based on historical data and algorithms that may not predict future performance</li>
              <li>Past performance is not indicative of future results</li>
              <li>All investments carry risk, including the potential loss of principal</li>
              <li>You should consult with a qualified financial advisor before making any investment decisions</li>
            </ul>
          </section>

          {/* User Accounts */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">5. User Accounts</h2>
            <p className="mb-4">
              To access certain features of our Services, you must create an account. You agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and promptly update your account information</li>
              <li>Maintain the security and confidentiality of your login credentials</li>
              <li>Accept responsibility for all activities that occur under your account</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
            </ul>
            <p className="mt-4">
              We reserve the right to suspend or terminate your account if any information provided is inaccurate, false, or violates these Terms.
            </p>
          </section>

          {/* Subscription and Payments */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">6. Subscription and Payments</h2>
            <p className="mb-4">
              Some features of our Services require a paid subscription. By subscribing to a paid plan, you agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Pay the applicable subscription fees as described at the time of purchase</li>
              <li>Provide valid payment information</li>
              <li>Authorize us to charge your payment method on a recurring basis</li>
              <li>Subscriptions automatically renew unless cancelled before the renewal date</li>
            </ul>
            <p className="mt-4">
              <strong className="text-yellow-400">Refund Policy:</strong> Subscription fees are generally non-refundable. However, we may provide refunds at our sole discretion on a case-by-case basis. Contact us at wallstreetstocks@outlook.com for refund inquiries.
            </p>
          </section>

          {/* Acceptable Use */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">7. Acceptable Use Policy</h2>
            <p className="mb-4">
              You agree not to use our Services to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on the intellectual property rights of others</li>
              <li>Transmit harmful, threatening, abusive, or harassing content</li>
              <li>Distribute spam, malware, or other harmful software</li>
              <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
              <li>Interfere with or disrupt the integrity or performance of our Services</li>
              <li>Scrape, data mine, or use automated means to access our Services without permission</li>
              <li>Share your account credentials with others or allow multiple users on a single account</li>
              <li>Use our Services for any commercial purpose without our written consent</li>
            </ul>
          </section>

          {/* Community Guidelines */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">8. Community Guidelines</h2>
            <p className="mb-4">
              When participating in community features, you agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Be respectful and civil in all interactions</li>
              <li>Not post false, misleading, or manipulative information about securities</li>
              <li>Not engage in market manipulation or promote "pump and dump" schemes</li>
              <li>Not share investment advice without proper qualifications and disclosures</li>
              <li>Not harass, bully, or threaten other users</li>
              <li>Not post content that violates others' privacy or intellectual property rights</li>
            </ul>
            <p className="mt-4">
              We reserve the right to remove content and suspend accounts that violate these guidelines.
            </p>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">9. Intellectual Property</h2>
            <p className="mb-4">
              All content, features, and functionality of our Services, including but not limited to text, graphics, logos, icons, images, audio, video, software, and data compilations, are the exclusive property of WallStreetStocks.ai and are protected by copyright, trademark, and other intellectual property laws.
            </p>
            <p>
              You may not reproduce, distribute, modify, create derivative works of, publicly display, or otherwise use any of our content without our prior written consent.
            </p>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">10. Third-Party Services and Data</h2>
            <p className="mb-4">
              Our Services may include data, content, or links from third-party sources. We do not endorse or assume responsibility for any third-party content. Market data is provided by third-party vendors and may be delayed or inaccurate.
            </p>
            <p>
              You acknowledge that we are not responsible for the accuracy, timeliness, or completeness of any third-party data displayed through our Services.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">11. Limitation of Liability</h2>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <p className="mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, WALLSTREETSTOCKS.AI AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Loss of profits, revenue, or data</li>
                <li>Investment losses or financial damages</li>
                <li>Business interruption</li>
                <li>Loss of goodwill or reputation</li>
              </ul>
              <p className="mt-4">
                OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
              </p>
            </div>
          </section>

          {/* Indemnification */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">12. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless WallStreetStocks.ai and its officers, directors, employees, contractors, and agents from any claims, damages, losses, liabilities, and expenses (including attorneys' fees) arising out of or related to your use of our Services, violation of these Terms, or infringement of any rights of another party.
            </p>
          </section>

          {/* Termination */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">13. Termination</h2>
            <p className="mb-4">
              We may terminate or suspend your access to our Services immediately, without prior notice or liability, for any reason, including but not limited to breach of these Terms.
            </p>
            <p>
              Upon termination, your right to use our Services will immediately cease. All provisions of these Terms which by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
            </p>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">14. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will notify users of material changes by posting the updated Terms on our website and updating the "Last Updated" date. Your continued use of our Services after such changes constitutes acceptance of the modified Terms.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">15. Governing Law and Dispute Resolution</h2>
            <p className="mb-4">
              These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.
            </p>
            <p>
              Any disputes arising out of or relating to these Terms or our Services shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association. You agree to waive any right to a jury trial or to participate in a class action lawsuit.
            </p>
          </section>

          {/* Severability */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">16. Severability</h2>
            <p>
              If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary so that these Terms shall otherwise remain in full force and effect.
            </p>
          </section>

          {/* Contact Information */}
          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">17. Contact Information</h2>
            <p className="mb-4">
              If you have any questions about these Terms, please contact us at:
            </p>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <p className="font-semibold text-yellow-400">WallStreetStocks.ai</p>
              <p className="mt-2">
                Email:{" "}
                <a href="mailto:wallstreetstocks@outlook.com" className="text-yellow-400 hover:underline">
                  wallstreetstocks@outlook.com
                </a>
              </p>
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
