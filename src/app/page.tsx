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

        {/* Features Section */}
        <Section
          id="features"
          title="Explore Our AI-Powered Features"
          description="Discover everything WallStreetStocks.ai offers — from M&A insights to portfolio intelligence."
        >
          <Features />
        </Section>

        {/* ✅ Renamed from Pricing to Plans */}
        <Section
          id="plans"
          title="Plans"
          description="Choose a plan that fits your goals — simple, transparent, and built for every investor."
        >
          <Pricing />
        </Section>

        {/* Testimonials Section */}
        <Section
          id="testimonials"
          title="What Our Clients Say"
          description="Hear from those who have partnered with us."
        >
          <Testimonials />
        </Section>

        {/* FAQ Section */}
        <FAQ />

        {/* Stats Section */}
        <Stats />

        {/* Call to Action */}
        <CTA />
      </Container>
    </>
  );
};

export default HomePage;
