import React from "react";
import { IBenefitBullet } from "@/types";

const BenefitBullet: React.FC<IBenefitBullet> = ({ title, description, icon }) => {
  return (
    <div className="flex items-start space-x-4">
      {icon && <div className="text-yellow-400">{icon}</div>}
      <div>
        <h4 className="text-lg font-semibold text-yellow-400">{title}</h4>
        <p className="text-gray-400">{description}</p>
      </div>
    </div>
  );
};

export default BenefitBullet;
