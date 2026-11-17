'use client';

import React, { useState } from 'react';
import {
  CONSTRUCTION_RULES,
  CONSTRUCTION_RULES_TITLE,
  CONSTRUCTION_RULES_VERSION,
} from '@/lib/constructionRules';
import { ShieldAlert, CheckCircle, ChevronDown, ChevronUp, FileText, X } from 'lucide-react';

interface ConstructionRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  accepted?: boolean;
}

export const ConstructionRulesModal: React.FC<ConstructionRulesModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  accepted = false,
}) => {
  const [openSection, setOpenSection] = useState<number | null>(null);
  const [hasScrolledEnd, setHasScrolledEnd] = useState(false);
  const [acknowledged, setAcknowledged] = useState(accepted);

  if (!isOpen) return null;

  const toggleSection = (index: number) => {
    setOpenSection(openSection === index ? null : index);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 30) {
      setHasScrolledEnd(true);
    }
  };

  const handleConfirm = () => {
    if (acknowledged && onAccept) {
      onAccept();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-emerald-100 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-700/80 rounded-lg">
              <FileText className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold leading-tight">
                Mandatory Construction Rules & Guidelines
              </h2>
              <p className="text-xs text-emerald-200 font-mono">
                Version: {CONSTRUCTION_RULES_VERSION} | Anugraha Evergreen Layout
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700/60 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Alert */}
        <div className="bg-emerald-50 border-b border-emerald-100 px-5 py-3 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-900 leading-relaxed">
            Please read the layout guidelines carefully before applying for a Construction NOC.
            Acceptance is legally binding for plot owners and contractors.
          </p>
        </div>

        {/* Scrollable Content */}
        <div
          onScroll={handleScroll}
          className="p-5 overflow-y-auto space-y-3.5 divide-y divide-gray-100 text-sm text-gray-700 flex-1"
        >
          {CONSTRUCTION_RULES.map((section, idx) => (
            <div key={idx} className="pt-3 first:pt-0">
              <button
                type="button"
                onClick={() => toggleSection(idx)}
                className="w-full flex items-center justify-between text-left font-semibold text-emerald-900 hover:text-emerald-700 py-1"
              >
                <span>{section.title}</span>
                {openSection === idx ? (
                  <ChevronUp className="w-4 h-4 text-emerald-600" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              <div
                className={`mt-2 space-y-2 text-xs sm:text-sm text-gray-600 pl-2 border-l-2 border-emerald-200 ${
                  openSection === idx || openSection === null ? 'block' : 'hidden'
                }`}
              >
                {section.points.map((point, pIdx) => (
                  <p key={pIdx} className="leading-relaxed">
                    • {point}
                  </p>
                ))}
              </div>
            </div>
          ))}

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 mt-4">
            <strong>Security Deposit Note:</strong> The ₹20,000 security deposit is kept in an escrow
            account. It will be refunded post-construction strictly upon the Management
            Committee&apos;s physical site clearance inspection.
          </div>
        </div>

        {/* Footer with Checkbox */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-3">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
            />
            <span className="text-xs sm:text-sm text-gray-800 font-medium">
              I have read, understood, and agree to strictly abide by the{' '}
              <span className="text-emerald-800 font-semibold">{CONSTRUCTION_RULES_TITLE}</span>.
            </span>
          </label>

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-gray-600 hover:text-gray-800 rounded-lg"
            >
              Close
            </button>
            <button
              type="button"
              disabled={!acknowledged}
              onClick={handleConfirm}
              className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition ${
                acknowledged
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              <span>Accept & Confirm</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
