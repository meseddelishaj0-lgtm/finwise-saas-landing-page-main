import { IFAQ } from "@/types";
import { siteDetails } from "./siteDetails";

export const faqs: IFAQ[] = [
    {
        question: `Is ${siteDetails.siteName} secure?`,
        answer: 'Absolutely. We use bank-level encryption to protect your data and never store your login information. Plus, our biometric authentication adds an extra layer of security.',
    },
    {
        question: `Can I use ${siteDetails.siteName} on multiple devices?`,
        answer: 'Absolutely! Your wallstreetstocks account syncs seamlessly across all your devices - smartphone, tablet, and computer.',
    },
    {
        question: 'Can I be a member?',
        answer: `Yes! ${siteDetails.siteName} Simply Sign Up through our secure portal to become a member.`
    },
    {
        question: 'Do I need any research expertise to use the research features?',
        answer: 'Not at all! Our expert-curated portfolios and educational resources make research accessible to everyone, regardless of experience level.',
    },
    {
        question: 'What if I need help?',
        answer: 'Our dedicated support team is available 24/7 via chat or email. Plus, we offer extensive tutorials and a comprehensive knowledge base to help you make the most of WallStreetStocks.'
    }
];