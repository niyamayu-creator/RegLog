import React, { useState } from 'react';
import { HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react';

interface InfoTooltipProps {
  text: string;
  title?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ text, title }) => {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-flex items-center ml-1.5 align-middle"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={title ? `Ayuda sobre ${title}` : 'Información estadística'}
        className="text-slate-400 hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 text-xs leading-relaxed rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-lg pointer-events-none"
        >
          {title && (
            <span className="block font-semibold text-slate-900 dark:text-white mb-1">
              {title}
            </span>
          )}
          <span className="block font-normal normal-case">{text}</span>
        </span>
      )}
    </span>
  );
};

interface KpiCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  tooltip?: string;
  tone?: 'neutral' | 'positive' | 'warning' | 'danger' | 'accent';
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  subtext,
  tooltip,
  tone = 'neutral',
}) => {
  const valueColor =
    tone === 'positive'
      ? 'text-emerald-700 dark:text-emerald-400'
      : tone === 'warning'
        ? 'text-amber-700 dark:text-amber-400'
        : tone === 'danger'
          ? 'text-rose-700 dark:text-rose-400'
          : tone === 'accent'
            ? 'text-blue-700 dark:text-blue-400'
            : 'text-slate-900 dark:text-slate-50';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
        <span className="truncate">{label}</span>
        {tooltip && <InfoTooltip text={tooltip} title={label} />}
      </div>
      <div className={`text-2xl font-semibold tracking-tight tabular-nums font-mono ${valueColor}`}>
        {value}
      </div>
      {subtext && (
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
          {subtext}
        </div>
      )}
    </div>
  );
};

interface ModuleHeaderProps {
  stepNumber: number;
  stage: string;
  title: string;
  description: string;
  onPrev?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  rightSlot?: React.ReactNode;
}

export const ModuleHeader: React.FC<ModuleHeaderProps> = ({
  stepNumber,
  stage,
  title,
  description,
  onPrev,
  onNext,
  nextLabel = 'Siguiente paso',
  nextDisabled = false,
  rightSlot,
}) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 mb-6 border-b border-slate-200 dark:border-slate-800">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
          <span>Módulo {String(stepNumber).padStart(2, '0')} de 15</span>
          <span aria-hidden="true">·</span>
          <span>Etapa: {stage}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white text-balance">
          {title}
        </h1>
        <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
          {description}
        </p>
      </div>
      <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
        {rightSlot}
        {onPrev && (
          <button
            type="button"
            onClick={onPrev}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>
        )}
        {onNext && (
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors whitespace-nowrap shrink-0"
          >
            {nextLabel}
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
