import React, { useMemo, useState } from 'react';
import { BookOpen, Search, X } from 'lucide-react';
import { GLOSSARY_TERMS, GlossaryTerm } from '../utils/glossary';

interface GlossaryDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const GlossaryDrawer: React.FC<GlossaryDrawerProps> = ({ open, onClose }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'Todos' | GlossaryTerm['category']>('Todos');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GLOSSARY_TERMS.filter((item) => {
      const matchesCat = category === 'Todos' || item.category === category;
      const matchesQuery =
        !q ||
        item.term.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.businessExample.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [query, category]);

  if (!open) return null;

  const categories: ('Todos' | GlossaryTerm['category'])[] = [
    'Todos',
    'Modelado',
    'Métricas',
    'Preparación',
    'Negocio',
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-[1px]">
      <div
        className="w-full max-w-md h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl"
        role="dialog"
        aria-label="Glosario Estadístico Integrado"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Glosario Estadístico y de Negocio
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar glosario"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 border-b border-slate-200 dark:border-slate-800">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar concepto (ej. Odds Ratio, AUC, SMOTE)..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  category === cat
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-500 dark:text-slate-400">
              No se encontraron términos que coincidan con "{query}".
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.term}
                className="pb-4 border-b border-slate-200 dark:border-slate-800 last:border-b-0"
              >
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  {item.category}
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
                  {item.term}
                </h3>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 mb-2">
                  {item.summary}
                </p>
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    Ejemplo de negocio:{' '}
                  </span>
                  {item.businessExample}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
