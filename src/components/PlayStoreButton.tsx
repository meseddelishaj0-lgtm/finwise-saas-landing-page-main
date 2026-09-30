import React from "react";
import { siteDetails } from "@/data/siteDetails";

const PlayStoreButton: React.FC = () => (
  <a
    href={siteDetails.googlePlayUrl}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Get Wall Street Stocks on Google Play"
    className="inline-flex items-center gap-3 px-5 py-2.5 rounded-xl
    bg-black text-white border border-white/25
    hover:border-yellow-400/60 hover:shadow-[0_0_25px_rgba(255,215,0,0.25)]
    hover:scale-[1.03] transition-all duration-300"
    style={{ textDecoration: "none" }}
  >
    {/* Google Play logo */}
    <svg viewBox="30 336.7 120.9 129.2" width="24" height="26" aria-hidden="true">
      <path fill="#FFD400" d="M119.2,421.2c15.3-8.4,27-14.8,28-15.3c3.2-1.7,6.5-6.2,0-9.7c-2.1-1.1-13.4-7.3-28-15.3l-20.1,20.2L119.2,421.2z" />
      <path fill="#FF3333" d="M99.1,401.1l-64.2,64.7c1.5,0.2,3.2-0.2,5.2-1.3c4.2-2.3,48.8-26.7,79.1-43.3L99.1,401.1L99.1,401.1z" />
      <path fill="#48FF48" d="M99.1,401.1l20.1-20.2c0,0-74.6-40.7-79.1-43.1c-1.7-1-3.6-1.3-5.3-1L99.1,401.1z" />
      <path fill="#3BCCFF" d="M99.1,401.1l-64.3-64.3c-2.6,0.6-4.8,2.9-4.8,7.6c0,7.5,0,107.5,0,113.8c0,4.3,1.7,7.4,4.9,7.7L99.1,401.1z" />
    </svg>
    <span className="flex flex-col items-start leading-tight">
      <span className="text-[11px] text-gray-300">Get it on</span>
      <span className="text-lg font-semibold -mt-0.5">Google Play</span>
    </span>
  </a>
);

export default PlayStoreButton;
