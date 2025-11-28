export interface IMenuItem {
  text: string;
  url: string;
  variant?: "button" | "link"; // ✅ Added this so 'variant' works
}

export interface IBenefit {
  title: string;
  description: string;
  imageSrc?: string;       // make optional since we now use widgets
  bullets: IBenefitBullet[];
  widget?: string;         // ✅ add this line (for TradingView widgets)
}


export interface IBenefitBullet {
  title: string;
  description: string;
  icon?: JSX.Element; // ✅ FIXED - optional 
}


export interface IPricing {
  name: string;
  price: number | string;
  features: string[]; 
  stripePriceId: string;
}

export interface IFAQ {
  question: string;
  answer: string;
}

export interface ITestimonial {
  name: string;
  role: string;
  message: string;
  avatar: string;
}

export interface IStats {
  title: string;
  icon: JSX.Element;
  description: string;
}

export interface ISocials {
  facebook?: string;
  github?: string;
  instagram?: string;
  linkedin?: string;
  threads?: string;
  twitter?: string;
  youtube?: string;
  x?: string;
  [key: string]: string | undefined;
}
