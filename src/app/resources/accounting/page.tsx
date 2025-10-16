import React from "react";
import Link from "next/link";

const AccountingPage = () => {
  return (
    <main className="min-h-screen py-16 px-6 md:px-20 bg-background text-foreground">
      <section className="max-w-5xl mx-auto text-center mb-12 pt-32 md:pt-40">

        <h1 className="text-4xl md:text-5xl font-bold mb-4 flex justify-center items-center gap-2">
          📘 Accounting Resources
        </h1>
        <p className="text-lg text-foreground-accent">
          Learn the language of business — from journal entries to financial statement analysis.
          These resources help you understand accounting from both a U.S. GAAP and IFRS perspective,
          essential for analysts, investors, and business owners.
        </p>
      </section>

      {/* Main Resource List */}
      <section className="max-w-4xl mx-auto space-y-10">
        {/* Financial Statements */}
        <div className="bg-card p-6 rounded-2xl shadow-md hover:shadow-xl transition">
          <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
            📄 Financial Statements Explained
          </h2>
          <p className="text-foreground-accent mb-3">
            Understand the structure and purpose of the three core financial statements — 
            the Balance Sheet, Income Statement, and Cash Flow Statement.  
            Learn how they connect, how to read them, and how companies use them to
            communicate financial performance.
          </p>
          <ul className="list-disc list-inside text-foreground-accent">
            <li>📊 Balance Sheet: Assets, Liabilities, and Equity</li>
            <li>💰 Income Statement: Revenue, Expenses, and Profitability</li>
            <li>🔁 Cash Flow Statement: Operating, Investing, and Financing activities</li>
          </ul>
          <Link href="#" className="text-primary mt-3 inline-block hover:underline">
            → Read more on Financial Statement Analysis
          </Link>
        </div>

        {/* GAAP vs IFRS */}
        <div className="bg-card p-6 rounded-2xl shadow-md hover:shadow-xl transition">
          <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
            🌍 GAAP vs IFRS Fundamentals
          </h2>
          <p className="text-foreground-accent mb-3">
            Compare the two most widely used accounting frameworks — U.S. GAAP and IFRS.
            Discover their conceptual differences, recognition criteria, and presentation rules
            for assets, liabilities, and revenue.
          </p>
          <ul className="list-disc list-inside text-foreground-accent">
            <li>U.S. GAAP: Rules-based, standardized by FASB</li>
            <li>IFRS: Principles-based, standardized by IASB</li>
            <li>Convergence trends between GAAP & IFRS</li>
          </ul>
          <Link href="#" className="text-primary mt-3 inline-block hover:underline">
            → View GAAP vs IFRS Comparison Chart
          </Link>
        </div>

        {/* Ratio Analysis */}
        <div className="bg-card p-6 rounded-2xl shadow-md hover:shadow-xl transition">
          <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
            📊 Ratio Analysis & Interpretation
          </h2>
          <p className="text-foreground-accent mb-3">
            Learn how to interpret financial health using key ratios from a company’s statements.
            Ratio analysis transforms raw data into actionable insights for valuation, performance,
            and risk assessment.
          </p>
          <ul className="list-disc list-inside text-foreground-accent">
            <li>Liquidity Ratios (Current, Quick)</li>
            <li>Profitability Ratios (ROE, ROA, Margin)</li>
            <li>Leverage Ratios (Debt-to-Equity, Interest Coverage)</li>
          </ul>
          <Link href="#" className="text-primary mt-3 inline-block hover:underline">
            → Explore Ratio Analysis Examples
          </Link>
        </div>

        {/* Auditing */}
        <div className="bg-card p-6 rounded-2xl shadow-md hover:shadow-xl transition">
          <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
            💡 Auditing & Internal Controls Basics
          </h2>
          <p className="text-foreground-accent mb-3">
            Auditing ensures the accuracy of financial statements and strengthens trust
            in corporate governance. Internal controls safeguard assets and prevent fraud.
          </p>
          <ul className="list-disc list-inside text-foreground-accent">
            <li>Types of audits: Internal, External, and Forensic</li>
            <li>Key internal control components (COSO framework)</li>
            <li>Ethics, independence, and audit opinions</li>
          </ul>
          <Link href="#" className="text-primary mt-3 inline-block hover:underline">
            → Learn more about Audit Procedures
          </Link>
        </div>
      </section>

      {/* Extra Learning Section */}
      <section className="max-w-5xl mx-auto mt-16 text-center">
        <h2 className="text-3xl font-semibold mb-4">📚 Expand Your Knowledge</h2>
        <p className="text-foreground-accent mb-6">
          Explore our recommended learning materials to master accounting and financial reporting:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card p-6 rounded-2xl shadow-md">
            <h3 className="font-semibold text-xl mb-2">🎓 Recommended Books</h3>
            <ul className="text-foreground-accent list-disc list-inside">
              <li>Financial Accounting by Weygandt, Kimmel, & Kieso</li>
              <li>Intermediate Accounting by Kieso & Warfield</li>
              <li>Auditing & Assurance Services by Arens & Elder</li>
            </ul>
          </div>
          <div className="bg-card p-6 rounded-2xl shadow-md">
            <h3 className="font-semibold text-xl mb-2">🧠 Online Courses</h3>
            <ul className="text-foreground-accent list-disc list-inside">
              <li>Coursera: Introduction to Financial Accounting (Wharton)</li>
              <li>edX: IFRS Certification Course</li>
              <li>LinkedIn Learning: Accounting Foundations</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
};

export default AccountingPage;
