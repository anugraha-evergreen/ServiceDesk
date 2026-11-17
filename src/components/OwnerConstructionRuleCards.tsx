'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldAlert,
  Zap,
  Banknote,
  Users,
  ArrowRight,
  ArrowLeft,
  Check,
  Lightbulb,
  Lock,
} from 'lucide-react';

export interface ConstructionRuleCard {
  id: number;
  title: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  officialRule: string;
  whatItMeans: string;
  keyChecklist: string[];
}

export const OWNER_CONSTRUCTION_RULES: ConstructionRuleCard[] = [
  {
    id: 1,
    title: 'Association Membership & Dues Clearance',
    category: '1. Pre-Requisites',
    icon: Users,
    officialRule:
      'Plot owner must be an active member of Anugraha Evergreen Owners Welfare Association (AEOWA) with the one-time membership fee of ₹1,000 and all quarterly layout maintenance dues fully cleared up to the current quarter before applying for Construction NOC.',
    whatItMeans:
      'Before starting your house construction, make sure your ₹1,000 one-time membership and all quarterly maintenance payments are up to date. The Managing Committee cannot issue a Construction NOC if maintenance dues are pending on record.',
    keyChecklist: [
      '₹1,000 one-time membership fee cleared',
      'Layout maintenance dues paid up to date',
      'Active AEOWA membership on record',
    ],
  },
  {
    id: 2,
    title: 'Refundable Security Deposit of ₹20,000',
    category: '2. Escrow Protection',
    icon: Banknote,
    officialRule:
      'A refundable Security Deposit of ₹20,000 must be deposited into the AEOWA escrow bank account prior to commencing site work. The bank transaction reference (UTR) and date must be submitted during NOC verification.',
    whatItMeans:
      'This ₹20,000 is an escrow deposit held in trust by the Association to safeguard layout roads, underground drainage, and electrical infrastructure. Once construction wraps up and your site is clean, the Association conducts a physical inspection and refunds the entire ₹20,000 directly back to your bank account.',
    keyChecklist: [
      '₹20,000 Security Deposit deposited in AEOWA account',
      'Bank transfer UTR / receipt submitted',
      '100% refundable upon site clearance sign-off',
    ],
  },
  {
    id: 3,
    title: 'Permitted Working Hours & Sunday Quiet Policy',
    category: '3. Hours & Noise',
    icon: Clock,
    officialRule:
      'Permitted construction hours are strictly between 8:00 AM and 6:00 PM, Monday through Saturday. No heavy machinery, stone cutters, concrete mixers, or noisy construction activities are permitted on Sundays or layout-designated public holidays.',
    whatItMeans:
      'Your contractor and workers may only work during daylight hours (8:00 AM to 6:00 PM, Mon–Sat). Sundays are strictly designated as peaceful quiet days for resident families in the layout. Instruct your contractor that concrete mixer trucks and stone-cutting power tools must never operate on Sundays.',
    keyChecklist: [
      'Working hours: 8:00 AM to 6:00 PM Mon–Sat',
      'Zero noisy construction or machinery on Sundays',
      'Delivery vehicles must enter only during daylight',
    ],
  },
  {
    id: 4,
    title: 'Mandatory On-Site Worker Sanitation & Toilet',
    category: '4. Worker Facilities',
    icon: Sparkles,
    officialRule:
      'A temporary functioning toilet and bathroom connected to the underground drainage (UGD) inspection chamber or septic tank must be constructed on-site before commencing any primary foundation or masonry work. Open defecation or urination anywhere within layout premises or neighbouring plots is strictly prohibited and attracts a penalty of ₹5,000 per violation from the security deposit.',
    whatItMeans:
      'Provide your workers with basic human dignity and proper hygiene by constructing a temporary toilet on day one. It must be connected to the underground drainage chamber. Workers must never urinate or defecate in open plots or layout roads. Any violation carries an immediate ₹5,000 penalty deducted from your deposit.',
    keyChecklist: [
      'Functioning worker toilet built before foundation work',
      'Connected to layout UGD inspection chamber',
      'Zero open defecation strictly enforced',
    ],
  },
  {
    id: 5,
    title: 'Storing Materials Inside Plot & Road Protection',
    category: '5. Road & Drains',
    icon: ShieldAlert,
    officialRule:
      'All building materials (sand, blue metal, bricks, cement, steel) must be stacked strictly within plot boundaries. Stacking materials on asphalt roads or pedestrian walkways without prior Association written permission is prohibited. Cement mixing directly on asphalt roads is strictly banned and must use a metal mixing tray or tarp.',
    whatItMeans:
      'Keep the asphalt road and footpath in front of your plot clear so neighbouring cars and school vans can pass safely. Never let workers mix cement directly on the asphalt, as cement slurry ruins road surfaces. Always insist that your contractor uses a metal mixing tray or heavy-duty tarp.',
    keyChecklist: [
      'Sand, bricks, and steel stored inside plot boundary',
      'Asphalt road and walkways kept completely unobstructed',
      'Concrete mixing tray or tarp mandatory at all times',
    ],
  },
  {
    id: 6,
    title: 'Worker Identification & Security Registration',
    category: '6. Security & Safety',
    icon: ShieldCheck,
    officialRule:
      'All on-site construction labourers, supervisors, and sub-contractors must be registered with their valid government identification proofs (Aadhaar / Voter ID) at the layout security desk. No unauthorized personnel or non-registered individuals are permitted on-site overnight.',
    whatItMeans:
      'For the security of all residents and children in Anugraha Evergreen, your contractor must submit worker lists and government ID copies to layout security. Ensure workers wear proper identification and do not trespass onto neighboring vacant plots after hours.',
    keyChecklist: [
      'Labourer identification deposited at main security gate',
      'Contractor and site supervisor contact numbers registered',
      'Layout access protocol strictly followed',
    ],
  },
  {
    id: 7,
    title: 'Authorized BESCOM Electricity & Water Sourcing',
    category: '7. Utilities',
    icon: Zap,
    officialRule:
      'Temporary construction electricity must be legally obtained through BESCOM via a dedicated construction meter. Drawing unauthorized power from streetlight poles or neighbouring connections is illegal and will lead to an immediate NOC cancellation and BESCOM reporting.',
    whatItMeans:
      'Apply for a legal temporary commercial/construction power meter from BESCOM. Connecting wires or hooks to layout streetlight poles or common electrical feeder boxes is strictly forbidden, hazardous, and will result in immediate NOC revocation.',
    keyChecklist: [
      'Authorized BESCOM temporary construction power meter',
      'Safe heavy-duty cabling and earthing',
      'Zero power tapping from streetlights or common layout lines',
    ],
  },
  {
    id: 8,
    title: 'Rainwater Harvesting & Deposit Refund Inspection',
    category: '8. Completion & Refund',
    icon: CheckCircle2,
    officialRule:
      'Building plans must incorporate a functional Rainwater Harvesting (RWH) groundwater recharge pit of prescribed capacity. Upon completion of construction, the Managing Committee will conduct a physical inspection to verify total debris removal, road/drain condition, and RWH installation before processing the ₹20,000 security deposit refund.',
    whatItMeans:
      'Rainwater harvesting protects our layout groundwater reserves. Ensure your builder constructs the recharge pit according to plan. Once construction wraps up, cart away all leftover rubble and mud from the road, then request the final Association inspection to receive your full ₹20,000 refund!',
    keyChecklist: [
      'Functional Rainwater Harvesting (RWH) recharge pit',
      'Complete debris and rubble clearance post-construction',
      'Final site inspection sign-off & full ₹20,000 refund release',
    ],
  },
];

interface OwnerConstructionRuleCardsProps {
  rulesAccepted: boolean;
  onAcceptChange: (accepted: boolean) => void;
  isEditing?: boolean;
}

export const OwnerConstructionRuleCards: React.FC<OwnerConstructionRuleCardsProps> = ({
  rulesAccepted,
  onAcceptChange,
  isEditing = false,
}) => {
  const totalRules = OWNER_CONSTRUCTION_RULES.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [maxVisited, setMaxVisited] = useState(
    isEditing || rulesAccepted ? totalRules - 1 : 0
  );
  const [completedReview, setCompletedReview] = useState(
    isEditing || rulesAccepted
  );

  useEffect(() => {
    if (rulesAccepted) {
      setCompletedReview(true);
      setMaxVisited(totalRules - 1);
    }
  }, [rulesAccepted, totalRules]);

  const currentRule = OWNER_CONSTRUCTION_RULES[currentIndex];
  const IconComponent = currentRule.icon;

  const handleNext = () => {
    if (currentIndex < totalRules - 1) {
      const next = currentIndex + 1;
      setCurrentIndex(next);
      setMaxVisited((prev) => Math.max(prev, next));
      if (next === totalRules - 1) {
        setCompletedReview(true);
      }
    } else {
      setCompletedReview(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleJump = (idx: number) => {
    if (idx <= maxVisited || completedReview) {
      setCurrentIndex(idx);
    }
  };

  const progressPercent = Math.round(((currentIndex + 1) / totalRules) * 100);

  return (
    <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
        <div>
          <h2 className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>1. Mandatory Construction Rules (Review Each Rule to Accept)</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Step through each rule card to understand bylaws, worker sanitation, and security deposit terms.
          </p>
        </div>
        <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 self-start sm:self-auto shrink-0">
          Rule {currentIndex + 1} of {totalRules} ({progressPercent}%)
        </span>
      </div>

      {/* Progress Bar & Step Dots */}
      <div className="space-y-2">
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-600 transition-all duration-300 ease-out rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Clickable step pills */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto py-1">
          {OWNER_CONSTRUCTION_RULES.map((rule, idx) => {
            const isActive = idx === currentIndex;
            const isDone = idx <= maxVisited || completedReview;
            return (
              <button
                key={rule.id}
                type="button"
                onClick={() => handleJump(idx)}
                disabled={!isDone && !completedReview}
                className={`flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-500'
                    : isDone
                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                }`}
                title={`Jump to Rule ${idx + 1}: ${rule.title}`}
              >
                {isDone && !isActive ? (
                  <Check className="w-3.5 h-3.5 text-emerald-700 stroke-[3]" />
                ) : (
                  idx + 1
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Rule Card */}
      <div className="p-4 sm:p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-4 transition-all">
        {/* Card Header */}
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-emerald-700 text-white rounded-xl shrink-0 shadow-xs">
            <IconComponent className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
              {currentRule.category} • Rule {currentRule.id} of {totalRules}
            </span>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
              {currentRule.title}
            </h3>
          </div>
        </div>

        {/* Official Rule Box */}
        <div className="p-3.5 bg-white rounded-xl border border-emerald-100 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
            Official Association Bylaw:
          </span>
          <p className="text-xs text-gray-700 leading-relaxed font-serif">
            &ldquo;{currentRule.officialRule}&rdquo;
          </p>
        </div>

        {/* "What this means for you" friendly explanation callout */}
        <div className="p-3.5 bg-emerald-100/70 rounded-xl border border-emerald-300 text-emerald-950 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
            <Lightbulb className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>What this means for you & your contractor:</span>
          </div>
          <p className="text-xs text-emerald-900/90 leading-relaxed font-medium">
            {currentRule.whatItMeans}
          </p>
        </div>

        {/* Key Checklist bullets */}
        <div className="space-y-1 pt-1">
          <span className="text-[11px] font-bold text-gray-600 block">
            Essential Checkpoints:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {currentRule.keyChecklist.map((pt, i) => (
              <div
                key={i}
                className="text-xs text-gray-700 flex items-center gap-1.5 bg-white/70 px-2 py-1 rounded-md border border-gray-100"
              >
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{pt}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-emerald-200">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous Rule</span>
          </button>

          {currentIndex < totalRules - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>Next Rule ({currentIndex + 2}/{totalRules})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              <span>All 8 Rules Reviewed!</span>
            </button>
          )}
        </div>
      </div>

      {/* Acceptance Checkbox Block */}
      <div
        className={`p-4 rounded-xl border transition ${
          completedReview
            ? 'bg-emerald-50 border-emerald-300'
            : 'bg-gray-50 border-gray-200 opacity-80'
        }`}
      >
        {!completedReview ? (
          <div className="flex items-center gap-2 text-xs text-amber-800 font-medium">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Please step through all 8 rules above to Rule 8 using <strong>&quot;Next Rule&quot;</strong> to unlock rule acceptance.
            </span>
          </div>
        ) : (
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={rulesAccepted}
              onChange={(e) => onAcceptChange(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
            />
            <div className="space-y-0.5">
              <span className="text-xs sm:text-sm font-bold text-gray-900 block">
                I have read, understood, and accept all 8 Mandatory Construction Rules & Guidelines. *
              </span>
              <span className="text-[11px] text-emerald-800 block">
                I confirm on behalf of myself and my appointed building contractor to comply with working hours, worker sanitation, road protection, and security deposit terms.
              </span>
            </div>
          </label>
        )}
      </div>
    </div>
  );
};
