"use client";

import React from "react";
import Link from "next/link";
import CommandLine from "@/components/ui/CommandLine";
import Reveal from "@/components/ui/Reveal";

export default function TermsAndConditions() {
  const lastUpdated = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-night text-ivory">
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-14 md:py-20">
        <Reveal>
          <CommandLine cmd="LGL" note="terms of service" className="mb-4" />
          <h1 className="font-display text-ivory text-4xl md:text-6xl tracking-tight">
            Terms and <em className="italic text-gold-soft">conditions</em>.
          </h1>
          <p className="mt-5 font-monodata text-[11px] uppercase tracking-widest text-gray-500">
            Last updated · {lastUpdated}
          </p>
        </Reveal>

        <Reveal delay={0.06}>
          <div className="prose-desk mt-12">
            <h2>1. Introduction</h2>
            <p>
              Welcome to WallStreetStocks.ai ("Company," "we," "our," or "us"). These Terms and Conditions ("Terms") govern your access to and use of our website, mobile applications, and services (collectively, the "Services"). By accessing or using our Services, you agree to be bound by these Terms. If you do not agree to these Terms, please do not use our Services.
            </p>

            <h2>2. Acceptance of Terms</h2>
            <p>
              By creating an account, accessing, or using our Services, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. You must be at least 18 years old to use our Services. If you are using our Services on behalf of an organization, you represent and warrant that you have the authority to bind that organization to these Terms.
            </p>

            <h2>3. Description of Services</h2>
            <p>
              WallStreetStocks.ai provides AI-powered financial research, analytics, and educational tools. Our Services include but are not limited to:
            </p>
            <ul>
              <li>AI-driven stock analysis and ratings</li>
              <li>Market research reports and insights</li>
              <li>Portfolio tracking and analytics tools</li>
              <li>Educational financial resources</li>
              <li>Community discussion features</li>
              <li>Real-time market data visualization</li>
            </ul>

            <h2>4. Important Disclaimers</h2>
            <div className="rounded-xl border border-gold/30 bg-gold/10 p-6">
              <p className="font-monodata text-[11px] uppercase tracking-widest text-gold">
                Not investment advice
              </p>
              <p className="mt-3">
                The information provided through our Services is for educational and informational purposes only and does not constitute investment advice, financial advice, trading advice, or any other sort of advice. You should not treat any of the content as such.
              </p>
            </div>
            <p>
              WallStreetStocks.ai does not recommend that any security, portfolio of securities, transaction, or investment strategy is suitable for any specific person. You understand that:
            </p>
            <ul>
              <li>We are not registered as a broker-dealer, investment advisor, or financial planner with the SEC, FINRA, or any other regulatory body</li>
              <li>Our AI-generated insights are based on historical data and algorithms that may not predict future performance</li>
              <li>Past performance is not indicative of future results</li>
              <li>All investments carry risk, including the potential loss of principal</li>
              <li>You should consult with a qualified financial advisor before making any investment decisions</li>
            </ul>

            <h2>5. User Accounts</h2>
            <p>
              To access certain features of our Services, you must create an account. You agree to:
            </p>
            <ul>
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and promptly update your account information</li>
              <li>Maintain the security and confidentiality of your login credentials</li>
              <li>Accept responsibility for all activities that occur under your account</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
            </ul>
            <p>
              We reserve the right to suspend or terminate your account if any information provided is inaccurate, false, or violates these Terms.
            </p>

            <h2>6. Subscription and Payments</h2>
            <p>
              Some features of our Services require a paid subscription. By subscribing to a paid plan, you agree to:
            </p>
            <ul>
              <li>Pay the applicable subscription fees as described at the time of purchase</li>
              <li>Provide valid payment information</li>
              <li>Authorize us to charge your payment method on a recurring basis</li>
              <li>Subscriptions automatically renew unless cancelled before the renewal date</li>
            </ul>
            <p>
              <strong>Refund Policy:</strong> Subscription fees are generally non-refundable. However, we may provide refunds at our sole discretion on a case-by-case basis. Contact us at wallstreetstocks@outlook.com for refund inquiries.
            </p>

            <h2>7. Acceptable Use Policy</h2>
            <p>You agree not to use our Services to:</p>
            <ul>
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

            <h2>8. Community Guidelines</h2>
            <p>When participating in community features, you agree to:</p>
            <ul>
              <li>Be respectful and civil in all interactions</li>
              <li>Not post false, misleading, or manipulative information about securities</li>
              <li>Not engage in market manipulation or promote "pump and dump" schemes</li>
              <li>Not share investment advice without proper qualifications and disclosures</li>
              <li>Not harass, bully, or threaten other users</li>
              <li>Not post content that violates others' privacy or intellectual property rights</li>
            </ul>
            <p>
              We reserve the right to remove content and suspend accounts that violate these guidelines.
            </p>

            <h2>9. Intellectual Property</h2>
            <p>
              All content, features, and functionality of our Services, including but not limited to text, graphics, logos, icons, images, audio, video, software, and data compilations, are the exclusive property of WallStreetStocks.ai and are protected by copyright, trademark, and other intellectual property laws.
            </p>
            <p>
              You may not reproduce, distribute, modify, create derivative works of, publicly display, or otherwise use any of our content without our prior written consent.
            </p>

            <h2>10. Third-Party Services and Data</h2>
            <p>
              Our Services may include data, content, or links from third-party sources. We do not endorse or assume responsibility for any third-party content. Market data is provided by third-party vendors and may be delayed or inaccurate.
            </p>
            <p>
              You acknowledge that we are not responsible for the accuracy, timeliness, or completeness of any third-party data displayed through our Services.
            </p>

            <h2>11. Limitation of Liability</h2>
            <div className="card-night p-6">
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, WALLSTREETSTOCKS.AI AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="mt-4">
                <li>Loss of profits, revenue, or data</li>
                <li>Investment losses or financial damages</li>
                <li>Business interruption</li>
                <li>Loss of goodwill or reputation</li>
              </ul>
              <p className="mt-4">
                OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
              </p>
            </div>

            <h2>12. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless WallStreetStocks.ai and its officers, directors, employees, contractors, and agents from any claims, damages, losses, liabilities, and expenses (including attorneys' fees) arising out of or related to your use of our Services, violation of these Terms, or infringement of any rights of another party.
            </p>

            <h2>13. Termination</h2>
            <p>
              We may terminate or suspend your access to our Services immediately, without prior notice or liability, for any reason, including but not limited to breach of these Terms.
            </p>
            <p>
              Upon termination, your right to use our Services will immediately cease. All provisions of these Terms which by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
            </p>

            <h2>14. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will notify users of material changes by posting the updated Terms on our website and updating the "Last Updated" date. Your continued use of our Services after such changes constitutes acceptance of the modified Terms.
            </p>

            <h2>15. Governing Law and Dispute Resolution</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.
            </p>
            <p>
              Any disputes arising out of or relating to these Terms or our Services shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association. You agree to waive any right to a jury trial or to participate in a class action lawsuit.
            </p>

            <h2>16. Severability</h2>
            <p>
              If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary so that these Terms shall otherwise remain in full force and effect.
            </p>

            <h2>17. Contact Information</h2>
            <p>If you have any questions about these Terms, please contact us at:</p>
            <div className="card-night p-6">
              <p className="font-monodata text-[11px] uppercase tracking-widest text-gray-500">
                WallStreetStocks.ai
              </p>
              <p className="mt-2">
                Email: <a href="mailto:wallstreetstocks@outlook.com">wallstreetstocks@outlook.com</a>
              </p>
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
