import PricingColumn from "./PricingColumn";
import Reveal from "@/components/ui/Reveal";

import { tiers } from "@/data/pricing";

const Pricing: React.FC = () => {
  return (
    <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
      {tiers.map((tier, index) => (
        <Reveal key={tier.name} delay={index * 0.1} className="h-full">
          <PricingColumn tier={tier} highlight={index === 1} />
        </Reveal>
      ))}
    </div>
  );
};

export default Pricing;
