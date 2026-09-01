'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Upload, FileText, TrendingUp, BookOpen, Brain, Library } from 'lucide-react';

export default function FinancePage() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles([...uploadedFiles, ...files]);
  };

  const handleRemove = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  return (
    <main className="min-h-screen bg-night py-14 px-6 text-ivory">
      <div className="max-w-5xl mx-auto text-center">
        {/* Header */}
        <Library className="w-12 h-12 text-gold mx-auto mb-3" />
        <h1 className="text-4xl mb-6 font-display font-normal tracking-tight md:text-5xl">Finance Resources</h1>
        <p className="text-lg text-gray-400 mb-10">
          Explore guides on investment strategy, valuation models, and portfolio management.
          You can also upload your own PDFs or notes to customize your learning.
        </p>

        {/* Upload Section */}
        <div className="bg-surface border border-white/10 shadow-sm rounded-2xl p-8 mb-14 text-left">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Upload className="w-6 h-6 text-gold" /> Upload Your Materials
          </h2>
          <p className="text-gray-400 mb-4">
            Add your own PDFs, class notes, or finance research for future access.
          </p>

          <label className="cursor-pointer bg-gold hover:bg-gold-deep text-night px-5 py-2.5 rounded-xl font-semibold inline-block transition">
            Choose File
            <input
              type="file"
              accept=".pdf"
              multiple
              onChange={handleUpload}
              className="hidden"
            />
          </label>

          {/* Uploaded Files */}
          {uploadedFiles.length > 0 && (
            <ul className="mt-6 space-y-2">
              {uploadedFiles.map((file, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between bg-surface2 p-3 rounded-lg"
                >
                  <span className="flex items-center gap-2 text-gray-100 font-medium">
                    <FileText className="w-5 h-5 text-gold" />
                    {file.name}
                  </span>
                  <button
                    onClick={() => handleRemove(index)}
                    className="text-red-500 hover:underline text-sm"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Resource Links */}
        <ul className="text-left space-y-6 text-gray-100 max-w-3xl mx-auto">
          <li>
            <Link
              href="/resources/finance/risk-return"
              className="flex items-center gap-2 hover:text-gold font-semibold transition"
            >
              <TrendingUp className="w-5 h-5 text-gold" />
              Understanding Risk and Return
            </Link>
          </li>

          <li>
            <Link
              href="/resources/finance/valuation"
              className="flex items-center gap-2 hover:text-gold font-semibold transition"
            >
              <BookOpen className="w-5 h-5 text-gold" />
              Valuation Models: DCF, Multiples, and Intrinsic Value
            </Link>
          </li>

          <li>
            <Link
              href="/resources/finance/behavioral"
              className="flex items-center gap-2 hover:text-gold font-semibold transition"
            >
              <Brain className="w-5 h-5 text-gold" />
              Market Psychology and Behavioral Finance
            </Link>
          </li>

          <li>
            <Link
              href="/resources/finance/portfolio"
              className="flex items-center gap-2 hover:text-gold font-semibold transition"
            >
              <FileText className="w-5 h-5 text-gold" />
              Building a Diversified Portfolio
            </Link>
          </li>
        </ul>

        {/* Back Button */}
        <div className="mt-12">
          <Link
            href="/resources"
            className="inline-block bg-white/10 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/10 transition"
          >
            ← Back to Resources
          </Link>
        </div>
      </div>
    </main>
  );
}
