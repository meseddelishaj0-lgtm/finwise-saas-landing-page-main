import Logos from "@/components/Logos";
import Benefits from "@/components/Benefits/Benefits";
import Container from "@/components/Container";
import CTA from "@/components/CTA";
import Reveal from "@/components/ui/Reveal";
import TickerTape from "@/components/market/TickerTape";
import TerminalHero from "@/components/market/TerminalHero";
import MarketsBoard from "@/components/market/MarketsBoard";
import NewsAndTrending from "@/components/market/NewsAndTrending";




const HomePage: React.FC = () => {
  return (
    <>
      {/* Terminal-style hero with live quotes */}
      <TerminalHero />

      {/* Scrolling ticker tape */}
      <TickerTape />

      {/* Live markets board: indices/stocks/crypto/ETFs + gainers/losers */}
      <MarketsBoard />

      {/* Market news + trending tickers */}
      <NewsAndTrending />

      {/* Company Logos */}
      <Logos />

      <Container>
        {/* Benefits Section */}
        <Benefits />

        {/* ✅ Removed the Explore Our AI-Powered Features section */}

        {/* ✅ Renamed from Pricing to Plans */}
        <section
          id="plans"
          className="relative w-screen overflow-hidden text-white bg-night"
          style={{ marginLeft: 'calc(-50vw + 50%)' }}
        >
          <div className="section-glow" />

          <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 text-center">
            <Reveal>
              <span className="badge-pill mb-5">
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
                    className={`glass-card group h-full flex flex-col p-8 ${
                      plan.featured
                        ? 'border-yellow-400/60 bg-gradient-to-b from-yellow-400/[0.08] to-white/[0.02] shadow-[0_0_35px_rgba(255,215,0,0.25)] md:scale-[1.04]'
                        : ''
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
                      className={plan.featured ? 'btn-gold w-full' : 'btn-ghost-gold w-full'}
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
  className="relative w-screen overflow-hidden text-white bg-night"
  style={{ marginLeft: 'calc(-50vw + 50%)' }}
>
  <div className="section-glow" />

  <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 text-center">
    <Reveal>
      <span className="badge-pill mb-5">
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
          <div className="glass-card group h-full flex flex-col p-8">
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
  className="relative w-screen overflow-hidden text-white bg-night"
  style={{ marginLeft: 'calc(-50vw + 50%)' }}
>
  <div className="section-glow" />

  <div className="relative z-10 max-w-7xl mx-auto px-6 py-24">
    {/* Title */}
    <div className="text-center mb-16">
      <span className="badge-pill mb-5">
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
          className="card-night group overflow-hidden hover:border-yellow-400/40 transition-all duration-300"
        >
          <summary className="flex justify-between items-center cursor-pointer px-6 py-4 text-lg font-semibold text-gray-100 hover:text-yellow-300 transition-colors duration-200">
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


      </Container>
    </>
  );
};

export default HomePage;
