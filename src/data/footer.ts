import { IMenuItem, ISocials } from "@/types";

export const footerDetails: {
    subheading: string;
    quickLinks: IMenuItem[];
    email: string;
    telephone: string;
    socials: ISocials;
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
    telephone: "+1(216)5483378",
    socials: {
        instagram: "https://www.instagram.com/wallstreetstocks",
    
    }
};
