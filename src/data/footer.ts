import { IMenuItem, ISocials } from "@/types"; 

export const footerDetails: {
    subheading: string;
    quickLinks: IMenuItem[];
    email: string;
    telephone: string;
    socials: ISocials;
    disclaimer?: string;
} = {
    subheading: "Empowering businesses with cutting-edge financial technology solutions.",
    quickLinks: [
        {
            text: "Features",
            url: "#features"
        },
        {
            text: "Plans",
            url: "#plans"
        },
        {
            text: "Community",
            url: "#commnunity"
        }
    ],
    email: "wallstreetstocks@outlook.com",
    telephone: "+1(216)548-33-78",
    socials: {
        instagram: "https://www.instagram.com/wallstreetstocks",
    },
    disclaimer: `Disclaimer:
WallStreetStocks.ai is a financial research and analytics platform powered by artificial intelligence and real-time market data. The information, tools, and insights provided are for educational and informational purposes only and do not constitute investment, legal, or tax advice.
WallStreetStocks.ai and its AI systems do not make personalized investment recommendations or solicit the purchase or sale of any security. Past performance is not indicative of future results. Users should conduct their own due diligence or consult with a licensed financial advisor before making any investment decisions.
WallStreetStocks.ai is not registered as a broker-dealer, investment advisor, or financial institution with the U.S. Securities and Exchange Commission (SEC), the Financial Industry Regulatory Authority (FINRA), or any other regulatory body.`
};
