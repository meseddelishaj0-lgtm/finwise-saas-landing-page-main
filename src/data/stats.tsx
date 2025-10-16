import { BsBarChartFill, BsFillStarFill } from "react-icons/bs";
import { PiGlobeFill } from "react-icons/pi";
import { IStats } from "@/types";

export const stats: IStats[] = [
  {
    title: "10,000+",
    icon: <BsBarChartFill size={34} className="text-blue-500" />,
    description: "Members use our AI Research, providing real-time insights.",
  },
  {
    title: "5.0",
    icon: (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <BsFillStarFill key={i} size={24} className="text-yellow-500" />
        ))}
      </div>
    ),
    description:
      "Star rating, consistently from our members for exceptional service and support.",
  },
  {
    title: "200+",
    icon: <PiGlobeFill size={34} className="text-green-600" />,
    description:
      "Hedge Funds & RIA use our AI Research to deliver alpha returns.",
  },
];
