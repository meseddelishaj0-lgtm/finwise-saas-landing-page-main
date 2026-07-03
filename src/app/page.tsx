import Hero from "@/components/Hero";
import Testimonials from "@/components/Testimonials";
import Pricing from "@/components/Pricing/Pricing";
import FAQ from "@/components/FAQ";
import Logos from "@/components/Logos";
import Benefits from "@/components/Benefits/Benefits";
import Container from "@/components/Container";
import Section from "@/components/Section";
import Stats from "@/components/Stats";
import CTA from "@/components/CTA";
import Features from "@/components/Features";
import Reveal from "@/components/ui/Reveal";




const HomePage: React.FC = () => {
  return (
    <>
      {/* Hero Section */}
      <Hero />

      {/* Company Logos */}
      <Logos />

      <Container>
        {/* Benefits Section */}
        <Benefits />

        {/* ✅ Removed the Explore Our AI-Powered Features section */}

        {/* ✅ Renamed from Pricing to Plans */}
        <section
          id="plans"
          className="relative w-screen overflow-hidden text-white bg-gradient-to-b from-black via-[#0a0a0a] to-[#0f0d05]"
          style={{ marginLeft: 'calc(-50vw + 50%)' }}
        >
          {/* Gold glow background */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.07)_0%,rgba(0,0,0,1)_80%)] pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-yellow-400/[0.06] rounded-full blur-[120px] pointer-events-none" />

          <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 text-center">
            <Reveal>
              <span className="inline-block px-4 py-1.5 mb-5 rounded-full text-sm font-medium text-yellow-300 bg-yellow-400/10 border border-yellow-400/25">
                Membership Plans
              </span>
              <h2 className="section-title-gold mb-4">Choose Your Edge</h2>
              <p className="text-gray-400 max-w-2xl mx-auto mb-16 text-lg">
                Simple, transparent pricing — built for every investor, from first trade to full portfolio.
              </p>
            </Reveal>

            {/* Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 lg:gap-10 items-stretch">
              {[
                {
                  name: 'Gold',
                  price: '$29.99',
                  tagline: 'Perfect for beginners starting their AI investing journey.',
                  features: ['AI Stock Picks', 'Weekly Research Reports', 'Fundamental AI Ratings', 'Beginner Portfolio Templates'],
                  featured: false,
                },
                {
                  name: 'Platinum',
                  price: '$49.99',
                  tagline: 'Everything in Gold, plus advanced AI tools and dashboards.',
                  features: ['Real-Time AI Dashboards', 'Advanced Portfolio Tracking', 'Sector Rotation & Trend Forecasts', 'Custom Research Requests'],
                  featured: true,
                },
                {
                  name: 'Diamond',
                  price: '$99.99',
                  tagline: 'Everything in Platinum, plus full research access and priority insights.',
                  features: ['Full AI Research Access', 'Predictive Market Outlooks', 'Institutional-Grade Reports', 'Portfolio Optimization Tools'],
                  featured: false,
                },
              ].map((plan, i) => (
                <Reveal key={plan.name} delay={i * 0.12} className="h-full">
                  <div
                    className={`group relative h-full flex flex-col p-8 rounded-2xl backdrop-blur-md transition-all duration-300 transform hover:-translate-y-2 ${
                      plan.featured
                        ? 'bg-gradient-to-b from-yellow-400/[0.08] to-white/[0.02] border border-yellow-400/60 shadow-[0_0_35px_rgba(255,215,0,0.25)] hover:shadow-[0_0_55px_rgba(255,215,0,0.45)] md:scale-[1.04]'
                        : 'bg-white/[0.03] border border-white/10 hover:border-yellow-400/50 hover:shadow-[0_0_30px_rgba(255,215,0,0.2)]'
                    }`}
                  >
                    {plan.featured && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-amber-400 text-black text-xs font-bold py-1.5 px-4 rounded-full shadow-[0_0_20px_rgba(255,215,0,0.5)]">
                        ⭐ Most Popular
                      </div>
                    )}
                    <h3 className="text-xl font-bold mb-2 text-yellow-300 tracking-wide uppercase">{plan.name}</h3>
                    <p className="text-4xl font-extrabold mb-2 text-white">
                      {plan.price}
                      <span className="text-lg font-medium text-gray-400">/mo</span>
                    </p>
                    <p className="text-sm text-gray-400 mb-8">{plan.tagline}</p>
                    <ul className="text-left text-gray-300 space-y-3 mb-10 flex-1">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <span className="mt-1 flex-shrink-0 w-4 h-4 rounded-full bg-yellow-400/15 border border-yellow-400/40 flex items-center justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                          </span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <a
                      href="/plans"
                      className={`inline-flex items-center justify-center px-6 py-3 font-bold rounded-full transition-all duration-300 ${
                        plan.featured
                          ? 'text-black bg-gradient-to-r from-yellow-400 to-amber-400 hover:shadow-[0_0_35px_rgba(255,215,0,0.7)]'
                          : 'text-yellow-300 bg-white/[0.04] border border-yellow-400/30 hover:bg-yellow-400 hover:text-black hover:border-yellow-400'
                      }`}
                    >
                      Subscribe
                    </a>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>



        {/* Testimonials Section */}
        <section
  id="testimonials"
  className="relative w-screen overflow-hidden text-white bg-gradient-to-b from-black via-[#0a0a0a] to-[#1a1a1a]"
  style={{ marginLeft: 'calc(-50vw + 50%)' }}
>
  {/* Soft gold glow overlay */}
  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.08)_0%,rgba(0,0,0,1)_80%)] pointer-events-none" />

  <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 text-center">
    <Reveal>
      <span className="inline-block px-4 py-1.5 mb-5 rounded-full text-sm font-medium text-yellow-300 bg-yellow-400/10 border border-yellow-400/25">
        Testimonials
      </span>
      <h2 className="section-title-gold mb-4">What Our Clients Say</h2>
      <p className="text-gray-400 max-w-2xl mx-auto mb-16 text-lg">
        Hear from those who have partnered with <span className="text-yellow-300 font-semibold">WallStreetStocks.ai</span>.
      </p>
    </Reveal>

    {/* Testimonials */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {[
        {
          img: '/images/testimonial-1.webp',
          name: 'John Smith',
          role: 'CEO at Company',
          quote:
            "WallStreetStocks’s AI-driven insights have transformed how we approach market research for our clients. It’s an invaluable resource in the modern financial landscape.",
        },
        {
          img: '/images/testimonial-2.webp',
          name: 'Jane Doe',
          role: 'CTO at Startup',
          quote:
            "As a CTO, I'm impressed by WallStreetStocks’s robust security measures and seamless integrations. It’s rare to find an app that balances user-friendliness with such advanced technology.",
        },
        {
          img: '/images/testimonial-3.webp',
          name: 'Emily Johnson',
          role: 'Product Manager',
          quote:
            "WallStreetStocks is revolutionizing market research. Its intuitive design and powerful AI-driven tools make it indispensable for anyone serious about financial growth.",
        },
      ].map((t, i) => (
        <Reveal key={t.name} delay={i * 0.12} className="h-full">
          <div className="group relative h-full flex flex-col bg-white/[0.03] backdrop-blur-md p-8 rounded-2xl border border-white/10 hover:border-yellow-400/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,215,0,0.2)] transform hover:-translate-y-2">
            <div className="absolute top-6 right-8 text-6xl text-yellow-400/15 font-serif leading-none select-none">”</div>
            <div className="flex text-yellow-400 mb-5 gap-0.5" aria-label="5 out of 5 stars">
              {'★★★★★'.split('').map((star, j) => (
                <span key={j} className="text-sm drop-shadow-[0_0_6px_rgba(255,215,0,0.5)]">{star}</span>
              ))}
            </div>
            <p className="text-gray-300 text-left leading-relaxed flex-1">“{t.quote}”</p>
            <div className="flex items-center gap-4 mt-6 pt-6 border-t border-white/10">
              <img
                src={t.img}
                alt={t.name}
                className="w-12 h-12 rounded-full border-2 border-yellow-400/60 shadow-[0_0_12px_rgba(255,215,0,0.3)]"
              />
              <div className="text-left">
                <h3 className="text-yellow-300 font-semibold">{t.name}</h3>
                <p className="text-sm text-gray-400">{t.role}</p>
              </div>
            </div>
          </div>
        </Reveal>
      ))}
    </div>
  </div>
</section>



        {/* FAQ Section */}
        <section
  id="faq"
  className="relative w-screen overflow-hidden text-white bg-gradient-to-b from-black via-[#0a0a0a] to-[#1a1a1a]"
  style={{ marginLeft: 'calc(-50vw + 50%)' }}
>
  {/* Gold Glow Overlay */}
  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.08)_0%,rgba(0,0,0,1)_80%)] pointer-events-none" />

  <div className="relative z-10 max-w-7xl mx-auto px-6 py-24">
    {/* Title */}
    <div className="text-center mb-16">
      <span className="inline-block px-4 py-1.5 mb-5 rounded-full text-sm font-medium text-yellow-300 bg-yellow-400/10 border border-yellow-400/25">
        FAQ
      </span>
      <h2 className="section-title-gold mb-4">
        Frequently Asked Questions
      </h2>
      <p className="text-gray-400 max-w-2xl mx-auto text-lg">
        Got questions? We’ve got answers. Reach us anytime at{' '}
        <a
          href="mailto:wallstreetstocks@outlook.com"
          className="text-yellow-300 underline hover:text-yellow-400 transition"
        >
          wallstreetstocks@outlook.com
        </a>
      </p>
    </div>

    {/* FAQ Items */}
    <div className="max-w-3xl mx-auto space-y-4">
      {[
        {
          q: 'Is WallStreetStocks secure?',
          a: 'Absolutely. WallStreetStocks.ai uses encrypted connections, advanced authentication protocols, and real-time monitoring to protect your data and activity.',
        },
        {
          q: 'Can I use WallStreetStocks on multiple devices?',
          a: 'Yes. You can securely log in from any device, including desktop, tablet, or mobile, with seamless data syncing and session protection.',
        },
        {
          q: 'Can I be a member?',
          a: 'Yes! Anyone can become a member. Choose your plan—Gold, Platinum, or Diamond—and unlock full access to AI-powered analytics and research tools.',
        },
        {
          q: 'Do I need any research expertise to use the research features?',
          a: 'Not at all. Our AI tools are built to simplify complex financial research, providing easy-to-read insights, ratings, and visual dashboards for every experience level.',
        },
        {
          q: 'What if I need help?',
          a: 'We’ve got you covered. Our support team is available via email at wallstreetstocks@outlook.com for any technical or account-related questions.',
        },
      ].map((faq, i) => (
        <details
          key={i}
          className="group border border-white/10 bg-white/[0.03] backdrop-blur-md rounded-xl overflow-hidden hover:border-yellow-400/50 hover:shadow-[0_0_20px_rgba(255,215,0,0.12)] transition-all duration-300"
        >
          <summary className="flex justify-between items-center cursor-pointer px-6 py-4 text-lg font-semibold text-white hover:text-yellow-300 transition-all duration-200">
            {faq.q}
            <span className="text-yellow-400 group-open:rotate-45 transition-transform duration-300">
              +
            </span>
          </summary>
          <div className="px-6 pb-4 text-gray-300">{faq.a}</div>
        </details>
      ))}
    </div>
  </div>
</section>



        {/* Call to Action */}
        <CTA />

        {/* Terms and Conditions Section */}
        <section
          id="terms"
          className="relative w-screen overflow-hidden text-white bg-gradient-to-b from-black via-[#0a0a0a] to-[#1a1a1a]"
          style={{ marginLeft: 'calc(-50vw + 50%)' }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.08)_0%,rgba(0,0,0,1)_80%)] pointer-events-none" />
          <div className="relative z-10 max-w-4xl mx-auto px-6 py-24">
            <h2 className="section-title-gold mb-4 text-center">
              Terms and Conditions
            </h2>
            <p className="text-gray-400 text-center mb-12">Last Updated: December 11, 2025</p>

            <div className="space-y-4 text-gray-300">
              {[
                {
                  title: '1. Introduction',
                  content: 'Welcome to WallStreetStocks.ai ("Company," "we," "our," or "us"). These Terms and Conditions ("Terms") govern your access to and use of our website, mobile applications, and services (collectively, the "Services"). By accessing or using our Services, you agree to be bound by these Terms. If you do not agree to these Terms, please do not use our Services.'
                },
                {
                  title: '2. Acceptance of Terms',
                  content: 'By creating an account, accessing, or using our Services, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. You must be at least 18 years old to use our Services. If you are using our Services on behalf of an organization, you represent and warrant that you have the authority to bind that organization to these Terms.'
                },
                {
                  title: '3. Description of Services',
                  content: 'WallStreetStocks.ai provides AI-powered financial research, analytics, and educational tools including: AI-driven stock analysis and ratings, market research reports and insights, portfolio tracking and analytics tools, educational financial resources, community discussion features, and real-time market data visualization.'
                },
                {
                  title: '4. Important Disclaimers - NOT INVESTMENT ADVICE',
                  content: 'The information provided through our Services is for educational and informational purposes only and does not constitute investment advice, financial advice, trading advice, or any other sort of advice. WallStreetStocks.ai does not recommend that any security, portfolio of securities, transaction, or investment strategy is suitable for any specific person. We are not registered as a broker-dealer, investment advisor, or financial planner with the SEC, FINRA, or any other regulatory body. Our AI-generated insights are based on historical data and algorithms that may not predict future performance. Past performance is not indicative of future results. All investments carry risk, including the potential loss of principal. You should consult with a qualified financial advisor before making any investment decisions.'
                },
                {
                  title: '5. User Accounts',
                  content: 'To access certain features of our Services, you must create an account. You agree to: provide accurate, current, and complete information during registration; maintain and promptly update your account information; maintain the security and confidentiality of your login credentials; accept responsibility for all activities that occur under your account; and notify us immediately of any unauthorized use of your account. We reserve the right to suspend or terminate your account if any information provided is inaccurate, false, or violates these Terms.'
                },
                {
                  title: '6. Subscription and Payments',
                  content: 'Some features of our Services require a paid subscription. By subscribing to a paid plan, you agree to pay the applicable subscription fees as described at the time of purchase, provide valid payment information, and authorize us to charge your payment method on a recurring basis. Subscriptions automatically renew unless cancelled before the renewal date. Refund Policy: Subscription fees are generally non-refundable. However, we may provide refunds at our sole discretion on a case-by-case basis. Contact us at wallstreetstocks@outlook.com for refund inquiries.'
                },
                {
                  title: '7. Acceptable Use Policy',
                  content: 'You agree not to use our Services to: violate any applicable laws or regulations; infringe on the intellectual property rights of others; transmit harmful, threatening, abusive, or harassing content; distribute spam, malware, or other harmful software; attempt to gain unauthorized access to our systems or other users\' accounts; interfere with or disrupt the integrity or performance of our Services; scrape, data mine, or use automated means to access our Services without permission; share your account credentials with others; or use our Services for any commercial purpose without our written consent.'
                },
                {
                  title: '8. Community Guidelines',
                  content: 'When participating in community features, you agree to: be respectful and civil in all interactions; not post false, misleading, or manipulative information about securities; not engage in market manipulation or promote "pump and dump" schemes; not share investment advice without proper qualifications and disclosures; not harass, bully, or threaten other users; and not post content that violates others\' privacy or intellectual property rights. We reserve the right to remove content and suspend accounts that violate these guidelines.'
                },
                {
                  title: '9. Intellectual Property',
                  content: 'All content, features, and functionality of our Services, including but not limited to text, graphics, logos, icons, images, audio, video, software, and data compilations, are the exclusive property of WallStreetStocks.ai and are protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, modify, create derivative works of, publicly display, or otherwise use any of our content without our prior written consent.'
                },
                {
                  title: '10. Third-Party Services and Data',
                  content: 'Our Services may include data, content, or links from third-party sources. We do not endorse or assume responsibility for any third-party content. Market data is provided by third-party vendors and may be delayed or inaccurate. You acknowledge that we are not responsible for the accuracy, timeliness, or completeness of any third-party data displayed through our Services.'
                },
                {
                  title: '11. Limitation of Liability',
                  content: 'TO THE MAXIMUM EXTENT PERMITTED BY LAW, WALLSTREETSTOCKS.AI AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO: loss of profits, revenue, or data; investment losses or financial damages; business interruption; loss of goodwill or reputation. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.'
                },
                {
                  title: '12. Indemnification',
                  content: 'You agree to indemnify, defend, and hold harmless WallStreetStocks.ai and its officers, directors, employees, contractors, and agents from any claims, damages, losses, liabilities, and expenses (including attorneys\' fees) arising out of or related to your use of our Services, violation of these Terms, or infringement of any rights of another party.'
                },
                {
                  title: '13. Termination',
                  content: 'We may terminate or suspend your access to our Services immediately, without prior notice or liability, for any reason, including but not limited to breach of these Terms. Upon termination, your right to use our Services will immediately cease. All provisions of these Terms which by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, indemnity, and limitations of liability.'
                },
                {
                  title: '14. Changes to Terms',
                  content: 'We reserve the right to modify these Terms at any time. We will notify users of material changes by posting the updated Terms on our website and updating the "Last Updated" date. Your continued use of our Services after such changes constitutes acceptance of the modified Terms.'
                },
                {
                  title: '15. Governing Law and Dispute Resolution',
                  content: 'These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions. Any disputes arising out of or relating to these Terms or our Services shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association. You agree to waive any right to a jury trial or to participate in a class action lawsuit.'
                },
                {
                  title: '16. Contact Information',
                  content: 'If you have any questions about these Terms, please contact us at: WallStreetStocks.ai - Email: wallstreetstocks@outlook.com'
                },
              ].map((item, i) => (
                <details
                  key={i}
                  className="group border border-white/10 bg-white/[0.03] backdrop-blur-md rounded-xl overflow-hidden hover:border-yellow-400/50 hover:shadow-[0_0_20px_rgba(255,215,0,0.12)] transition-all duration-300"
                >
                  <summary className="flex justify-between items-center cursor-pointer px-6 py-4 text-lg font-semibold text-white hover:text-yellow-300 transition-all duration-200">
                    {item.title}
                    <span className="text-yellow-400 group-open:rotate-45 transition-transform duration-300">+</span>
                  </summary>
                  <div className="px-6 pb-4 text-gray-300 text-sm leading-relaxed">{item.content}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Privacy Policy Section */}
        <section
          id="privacy"
          className="relative w-screen overflow-hidden text-white bg-gradient-to-b from-[#1a1a1a] via-[#0a0a0a] to-black"
          style={{ marginLeft: 'calc(-50vw + 50%)' }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.08)_0%,rgba(0,0,0,1)_80%)] pointer-events-none" />
          <div className="relative z-10 max-w-4xl mx-auto px-6 py-24">
            <h2 className="section-title-gold mb-4 text-center">
              Privacy Policy
            </h2>
            <p className="text-gray-400 text-center mb-12">Last Updated: December 11, 2025</p>

            <div className="space-y-4 text-gray-300">
              {[
                {
                  title: '1. Introduction',
                  content: 'WallStreetStocks.ai ("Company," "we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website, mobile applications, and services (collectively, the "Services"). Please read this Privacy Policy carefully. By using our Services, you consent to the practices described in this policy.'
                },
                {
                  title: '2. Information We Collect',
                  content: 'We collect information you voluntarily provide: Account Information (name, email address, username, password, profile picture), Profile Information (bio, location, website), Payment Information (credit card details, billing address - processed securely through third-party payment processors), Communication Data (messages, feedback, support requests, community posts), Portfolio Data (stock symbols, watchlists, investment preferences). We automatically collect: Device Information (device type, operating system, unique device identifiers, browser type), Usage Data (pages visited, features used, time spent, click patterns, search queries), Location Data (general geographic location based on IP address), Log Data (IP address, access times, referring URLs, error logs).'
                },
                {
                  title: '3. Cookies and Tracking Technologies',
                  content: 'We use cookies, web beacons, and similar technologies to enhance your experience, analyze usage, and deliver personalized content. Cookie types include: Essential (required for basic site functionality and security), Analytics (help us understand how visitors interact with our Services), Functional (remember your preferences and settings), Marketing (used to deliver relevant advertisements with consent). You can control cookie preferences through your browser settings, though disabling cookies may limit some functionality.'
                },
                {
                  title: '4. How We Use Your Information',
                  content: 'We use your information to: provide, maintain, and improve our Services; create and manage your account; process payments and subscriptions; personalize your experience and deliver relevant content; send transactional emails (account verification, password resets, subscription updates); send marketing communications (with your consent); respond to customer support inquiries; monitor and analyze usage patterns and trends; detect, prevent, and address technical issues and security threats; comply with legal obligations; and enforce our Terms and Conditions.'
                },
                {
                  title: '5. How We Share Your Information',
                  content: 'We may share your information with: Service Providers (trusted third-party vendors who assist us in operating our Services such as payment processors, cloud hosting, analytics providers, email services); Legal Requirements (if required by law, court order, or government request, or to protect our rights, privacy, safety, or property); Business Transfers (in the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity); With Your Consent (we may share your information for any other purpose with your explicit consent). IMPORTANT: We Do NOT Sell Your Personal Information. WallStreetStocks.ai does not sell, rent, or trade your personal information to third parties for their marketing purposes.'
                },
                {
                  title: '6. Data Security',
                  content: 'We implement industry-standard security measures to protect your information, including: encryption of data in transit using SSL/TLS protocols; encryption of sensitive data at rest; secure authentication mechanisms; regular security assessments and monitoring; access controls limiting employee access to personal data. However, no method of transmission or storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.'
                },
                {
                  title: '7. Data Retention',
                  content: 'We retain your personal information for as long as necessary to provide our Services, comply with legal obligations, resolve disputes, and enforce our agreements. When you delete your account, we will delete or anonymize your personal information within 90 days, except where retention is required by law.'
                },
                {
                  title: '8. Your Rights and Choices',
                  content: 'Depending on your location, you may have the following rights: Access (request a copy of the personal information we hold about you); Correction (request correction of inaccurate or incomplete information); Deletion (request deletion of your personal information); Portability (request a portable copy of your data); Opt-Out (opt out of marketing communications at any time); Restriction (request restriction of processing in certain circumstances); Objection (object to processing based on legitimate interests). To exercise these rights, contact us at wallstreetstocks@outlook.com. We will respond to your request within 30 days.'
                },
                {
                  title: '9. California Privacy Rights (CCPA)',
                  content: 'If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA): Right to know what personal information is collected, used, shared, or sold; Right to delete personal information (with certain exceptions); Right to opt-out of the sale of personal information (we do not sell your data); Right to non-discrimination for exercising your privacy rights. To submit a CCPA request, email us at wallstreetstocks@outlook.com with "CCPA Request" in the subject line.'
                },
                {
                  title: '10. International Data Transfers',
                  content: 'Your information may be transferred to and processed in countries other than your own, including the United States. These countries may have different data protection laws. By using our Services, you consent to the transfer of your information to these countries. We take appropriate safeguards to ensure your data is protected in accordance with this Privacy Policy.'
                },
                {
                  title: '11. Children\'s Privacy',
                  content: 'Our Services are not intended for children under 18 years of age. We do not knowingly collect personal information from children. If we learn that we have collected information from a child under 18, we will delete that information promptly. If you believe we have collected information from a child, please contact us immediately.'
                },
                {
                  title: '12. Third-Party Links and Services',
                  content: 'Our Services may contain links to third-party websites, applications, or services. This Privacy Policy does not apply to those third parties. We encourage you to review the privacy policies of any third-party services you access through our platform.'
                },
                {
                  title: '13. Changes to This Privacy Policy',
                  content: 'We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on our website and updating the "Last Updated" date. We encourage you to review this Privacy Policy periodically. Your continued use of our Services after changes constitutes acceptance of the updated policy.'
                },
                {
                  title: '14. Contact Us',
                  content: 'If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us: WallStreetStocks.ai - Email: wallstreetstocks@outlook.com. For privacy-related inquiries, please include "Privacy Inquiry" in your email subject line.'
                },
              ].map((item, i) => (
                <details
                  key={i}
                  className="group border border-white/10 bg-white/[0.03] backdrop-blur-md rounded-xl overflow-hidden hover:border-yellow-400/50 hover:shadow-[0_0_20px_rgba(255,215,0,0.12)] transition-all duration-300"
                >
                  <summary className="flex justify-between items-center cursor-pointer px-6 py-4 text-lg font-semibold text-white hover:text-yellow-300 transition-all duration-200">
                    {item.title}
                    <span className="text-yellow-400 group-open:rotate-45 transition-transform duration-300">+</span>
                  </summary>
                  <div className="px-6 pb-4 text-gray-300 text-sm leading-relaxed">{item.content}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

      </Container>
    </>
  );
};

export default HomePage;
