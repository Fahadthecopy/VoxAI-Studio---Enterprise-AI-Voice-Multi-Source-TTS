import React from 'react';
import { Check, Sparkles, Zap, Shield, HelpCircle } from 'lucide-react';

export const PricingModal: React.FC = () => {
  const plans = [
    {
      name: 'Free Starter',
      price: '$0',
      period: 'forever',
      description: 'Ideal for trying out AI narration and converting short documents.',
      chars: '10,000 characters/mo',
      features: [
        'All 3 Input Modes (Text, Files, Articles)',
        'Basic multilingual voices (English, Hindi, Spanish)',
        'Standard WAV & MP3 downloads',
        'Direct SSRF-protected article extraction',
        'File uploads up to 10 MB',
      ],
      current: false,
      cta: 'Current Plan',
    },
    {
      name: 'Creator Pro',
      price: '$19',
      period: '/month',
      description: 'For YouTubers, podcasters, writers, and digital educators.',
      chars: '100,000 characters/mo',
      popular: true,
      features: [
        'Everything in Free',
        'All 14+ Voice Personas (Urdu, Arabic, French, German)',
        'YouTube Voiceover Studio with Presets',
        'Multi-Speaker Podcast Studio',
        'Pronunciation Dictionary Overrides',
        'Advanced Long-Form Text Chunking Engine',
        'Priority high-speed synthesis',
      ],
      current: true,
      cta: 'Active Plan',
    },
    {
      name: 'Studio Enterprise',
      price: '$79',
      period: '/month',
      description: 'For media studios, audio publishers, and agency workflows.',
      chars: '1,000,000 characters/mo',
      features: [
        'Everything in Creator Pro',
        'Up to 25 MB document uploads (PDF, DOCX, RTF, MD)',
        'Commercial broadcast licensing',
        'Custom voice styles & emotion presets',
        'Audit logs & administrative access',
        'Dedicated API access & webhook exports',
      ],
      current: false,
      cta: 'Upgrade to Enterprise',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
          Transparent, Scalable AI Audio Plans
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          No fake infinite limits or hidden costs. Real character allowances and authentic AI voice generation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {plans.map(plan => (
          <div
            key={plan.name}
            className={`rounded-2xl p-6 border flex flex-col justify-between transition-all relative ${
              plan.popular
                ? 'bg-slate-900 border-indigo-500 shadow-xl shadow-indigo-600/20'
                : 'bg-slate-900/60 border-slate-800'
            }`}
          >
            {plan.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-md">
                Most Popular
              </span>
            )}

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-100">{plan.name}</h3>
                <p className="text-xs text-slate-400 mt-1">{plan.description}</p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white">{plan.price}</span>
                <span className="text-xs text-slate-400 font-mono">{plan.period}</span>
              </div>

              <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono font-semibold text-indigo-400">
                {plan.chars}
              </div>

              <div className="space-y-2.5 pt-2 text-xs">
                {plan.features.map(f => (
                  <div key={f} className="flex items-start gap-2 text-slate-300">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6">
              <button
                disabled={plan.current}
                className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
                  plan.current
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : plan.popular
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
