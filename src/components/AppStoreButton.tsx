import React from "react";

const AppStoreButton: React.FC = () => (
  <a
    href="#"
    className="inline-flex items-center px-4 py-2 bg-black text-white rounded-lg shadow hover:bg-gray-800 transition-colors"
    style={{ textDecoration: "none" }}
    aria-label="Download on the App Store"
  >
    {/* You can replace this with an SVG or App Store logo if you have one */}
    <span style={{ fontWeight: 600, fontSize: 16 }}>App Store</span>
  </a>
);

export default AppStoreButton;
