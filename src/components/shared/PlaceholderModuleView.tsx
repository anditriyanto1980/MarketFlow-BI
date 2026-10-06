import React from 'react';
import { Sparkles, Calendar, Layers } from 'lucide-react';
import { PageHeader } from './PageHeader';

interface PlaceholderModuleViewProps {
  title: string;
  category: string;
  description: string;
  roadmapDetails: string[];
  plannedPhase: string;
}

export const PlaceholderModuleView: React.FC<PlaceholderModuleViewProps> = ({
  title,
  category,
  description,
  roadmapDetails,
  plannedPhase,
}) => {
  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title={title}
        subtitle={`${category} — Terjadwal pada ${plannedPhase}`}
        badge={
          <span className="text-xs uppercase tracking-wider bg-stone-900 text-stone-400 px-2 py-0.5 rounded border border-stone-800">
            Roadmap
          </span>
        }
      />

      <div className="p-8 rounded-2xl bg-stone-900/60 border border-stone-800/80 space-y-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-stone-800 rounded-xl text-emerald-400 shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-stone-100">{title}</h3>
            <p className="text-sm text-stone-400 mt-1 leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-stone-950/70 border border-stone-800 space-y-3">
          <div className="text-xs font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Spesifikasi Arsitektur yang Telah Disiapkan:</span>
          </div>
          <ul className="space-y-2 text-xs text-stone-400">
            {roadmapDetails.map((detail, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold shrink-0">•</span>
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-2 text-xs text-stone-400 border-t border-stone-800/80 pt-4">
          <Calendar className="w-4 h-4 text-stone-500" />
          <span>Fondasi multi-tenant, model data, dan struktur isolasi keamanan untuk modul ini telah aktif di Foundation V0.1.</span>
        </div>
      </div>
    </div>
  );
};
