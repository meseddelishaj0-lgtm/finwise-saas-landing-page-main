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
  className="relative w-screen overflow-hidden text-white bg-gradient-to-b from-black via-[#0a0a0a] to-[#1a1a1a]"
  style={{ marginLeft: 'calc(-50vw + 50%)' }}
>
  {/* Gold glow background */}
  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.08)_0%,rgba(0,0,0,1)_80%)] pointer-events-none" />

  <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 text-center">
    {/* Section Title */}
    <h2 className="text-4xl md:text-5xl font-extrabold mb-4 text-yellow-400 drop-shadow-[0_0_15px_rgba(255,215,0,0.4)]">
      Plans
    </h2>
    <p className="text-gray-400 max-w-2xl mx-auto mb-16 text-lg">
      Choose a plan that fits your goals — <span className="text-yellow-300 font-medium">simple</span>, transparent, and built for every investor.
    </p>

    {/* Pricing Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
      {/* Gold Plan */}
      <div className="group relative p-8 rounded-2xl bg-gradient-to-b from-[#111] to-[#1a1a1a] border border-gray-800 hover:border-yellow-400 transition-all duration-300 hover:shadow-[0_0_25px_rgba(255,215,0,0.6)] transform hover:-translate-y-2">
        <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.4)_0%,rgba(0,0,0,0)_70%)] transition-opacity duration-500 rounded-2xl" />
        <h3 className="text-2xl font-bold mb-3 text-yellow-400">Gold</h3>
        <p className="text-3xl font-extrabold mb-1 text-white">$29.99<span className="text-lg font-medium text-gray-400">/mo</span></p>
        <p className="text-sm text-gray-400 mb-6">Perfect for beginners starting their AI investing journey.</p>
        <ul className="text-left text-gray-300 space-y-2 mb-8">
          <li>✔ AI Stock Picks</li>
          <li>✔ Weekly Research Reports</li>
          <li>✔ Fundamental AI Ratings</li>
          <li>✔ Beginner Portfolio Templates</li>
        </ul>
        <button className="relative inline-flex items-center justify-center px-6 py-2 font-semibold text-black bg-yellow-400 rounded-full hover:bg-yellow-300 transition-all duration-300 hover:shadow-[0_0_25px_rgba(255,215,0,0.8)]">
          Subscribe
        </button>
      </div>

      {/* Platinum Plan */}
      <div className="group relative p-8 rounded-2xl bg-gradient-to-b from-[#111] to-[#1a1a1a] border border-yellow-400 shadow-[0_0_25px_rgba(255,215,0,0.6)] hover:shadow-[0_0_50px_rgba(255,215,0,0.8)] transition-all duration-500 transform hover:-translate-y-3 scale-105">
        <div className="absolute inset-0 opacity-0 group-hover:opacity-30 bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.5)_0%,rgba(0,0,0,0)_70%)] transition-opacity duration-500 rounded-2xl" />
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-xs font-semibold py-1 px-3 rounded-full shadow-md">
          ⭐ Most Popular
        </div>
        <h3 className="text-2xl font-bold mb-3 text-yellow-300">Platinum</h3>
        <p className="text-3xl font-extrabold mb-1 text-white">$49.99<span className="text-lg font-medium text-gray-400">/mo</span></p>
        <p className="text-sm text-gray-400 mb-6">Everything included in Gold, plus advanced AI tools and dashboards.</p>
        <ul className="text-left text-gray-300 space-y-2 mb-8">
          <li>✔ Real-Time AI Dashboards</li>
          <li>✔ Advanced Portfolio Tracking</li>
          <li>✔ Sector Rotation & Trend Forecasts</li>
          <li>✔ Custom Research Requests</li>
        </ul>
        <button className="relative inline-flex items-center justify-center px-6 py-2 font-semibold text-black bg-yellow-400 rounded-full hover:bg-yellow-300 transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,215,0,0.9)]">
          Subscribe
        </button>
      </div>

      {/* Diamond Plan */}
      <div className="group relative p-8 rounded-2xl bg-gradient-to-b from-[#111] to-[#1a1a1a] border border-gray-800 hover:border-yellow-400 transition-all duration-300 hover:shadow-[0_0_25px_rgba(255,215,0,0.6)] transform hover:-translate-y-2">
        <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.4)_0%,rgba(0,0,0,0)_70%)] transition-opacity duration-500 rounded-2xl" />
        <h3 className="text-2xl font-bold mb-3 text-yellow-400">Diamond</h3>
        <p className="text-3xl font-extrabold mb-1 text-white">$99.99<span className="text-lg font-medium text-gray-400">/mo</span></p>
        <p className="text-sm text-gray-400 mb-6">Everything included in Platinum, plus full research access and priority insights.</p>
        <ul className="text-left text-gray-300 space-y-2 mb-8">
          <li>✔ Full AI Research Access</li>
          <li>✔ Predictive Market Outlooks</li>
          <li>✔ Institutional-Grade Reports</li>
          <li>✔ Portfolio Optimization Tools</li>
        </ul>
        <button className="relative inline-flex items-center justify-center px-6 py-2 font-semibold text-black bg-yellow-400 rounded-full hover:bg-yellow-300 transition-all duration-300 hover:shadow-[0_0_25px_rgba(255,215,0,0.8)]">
          Subscribe
        </button>
      </div>
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
    {/* Section Title */}
    <h2 className="text-4xl md:text-5xl font-extrabold mb-4 text-yellow-400 drop-shadow-[0_0_15px_rgba(255,215,0,0.4)]">
      What Our Clients Say
    </h2>
    <p className="text-gray-400 max-w-2xl mx-auto mb-16 text-lg">
      Hear from those who have partnered with <span className="text-yellow-300 font-semibold">WallStreetStocks.ai</span>.
    </p>

    {/* Testimonials */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Testimonial 1 */}
      <div className="group relative bg-gradient-to-b from-[#111] to-[#1a1a1a] p-8 rounded-2xl border border-gray-800 hover:border-yellow-400 transition-all duration-300 hover:shadow-[0_0_25px_rgba(255,215,0,0.6)] transform hover:-translate-y-2">
        <div className="flex items-center gap-4 mb-4">
          <img
            src="/images/testimonial-1.webp"
            alt="John Smith"
            className="w-12 h-12 rounded-full border border-yellow-400"
          />
          <div className="text-left">
            <h3 className="text-yellow-300 font-semibold">John Smith</h3>
            <p className="text-sm text-gray-400">CEO at Company</p>
          </div>
        </div>
        <p className="text-gray-300 text-left">
          "WallStreetStocks’s AI-driven insights have transformed how we approach market research for our clients. It’s an invaluable resource in the modern financial landscape."
        </p>
      </div>

      {/* Testimonial 2 */}
      <div className="group relative bg-gradient-to-b from-[#111] to-[#1a1a1a] p-8 rounded-2xl border border-gray-800 hover:border-yellow-400 transition-all duration-300 hover:shadow-[0_0_25px_rgba(255,215,0,0.6)] transform hover:-translate-y-2">
        <div className="flex items-center gap-4 mb-4">
          <img
            src="/images/testimonial-2.webp"
            alt="Jane Doe"
            className="w-12 h-12 rounded-full border border-yellow-400"
          />
          <div className="text-left">
            <h3 className="text-yellow-300 font-semibold">Jane Doe</h3>
            <p className="text-sm text-gray-400">CTO at Startup</p>
          </div>
        </div>
        <p className="text-gray-300 text-left">
          "As a CTO, I'm impressed by WallStreetStocks’s robust security measures and seamless integrations. It’s rare to find an app that balances user-friendliness with such advanced technology."
        </p>
      </div>

      {/* Testimonial 3 */}
      <div className="group relative bg-gradient-to-b from-[#111] to-[#1a1a1a] p-8 rounded-2xl border border-gray-800 hover:border-yellow-400 transition-all duration-300 hover:shadow-[0_0_25px_rgba(255,215,0,0.6)] transform hover:-translate-y-2">
        <div className="flex items-center gap-4 mb-4">
          <img
            src="/images/testimonial-3.webp"
            alt="Emily Johnson"
            className="w-12 h-12 rounded-full border border-yellow-400"
          />
          <div className="text-left">
            <h3 className="text-yellow-300 font-semibold">Emily Johnson</h3>
            <p className="text-sm text-gray-400">Product Manager</p>
          </div>
        </div>
        <p className="text-gray-300 text-left">
          "WallStreetStocks is revolutionizing market research. Its intuitive design and powerful AI-driven tools make it indispensable for anyone serious about financial growth."
        </p>
      </div>
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
      <h2 className="text-4xl md:text-5xl font-extrabold text-yellow-400 drop-shadow-[0_0_15px_rgba(255,215,0,0.4)] mb-4">
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
          className="group border border-gray-800 bg-gradient-to-b from-[#111] to-[#1a1a1a] rounded-xl overflow-hidden hover:border-yellow-400 transition-all duration-300"
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
      </Container>
    </>
  );
};

export default HomePage;
