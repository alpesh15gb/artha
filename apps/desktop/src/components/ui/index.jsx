import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { createPortal } from 'react-dom';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function Portal({ children }) {
  return createPortal(children, document.body);
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading,
  icon: Icon,
  className,
  ...props
}) {
  const variants = {
    primary: 'bg-[#4f46e5] text-white hover:bg-[#4338ca] shadow-sm',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
    success: 'bg-[#10b981] text-white hover:bg-[#059669]',
    danger: 'bg-[#ef4444] text-white hover:bg-[#dc2626]',
    ghost: 'text-slate-600 hover:bg-slate-100',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs font-bold uppercase tracking-wider',
    md: 'px-4 py-2 text-sm font-bold uppercase tracking-widest',
    lg: 'px-6 py-2.5 text-sm font-black uppercase tracking-[0.2em]',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-indigo-500/50',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : Icon ? (
        <Icon className="w-4 h-4" />
      ) : null}
      {children}
    </button>
  );
}

export function Input({
  label,
  error,
  icon: Icon,
  className,
  ...props
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest">{label}</label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          className={cn(
            'w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white shadow-sm',
            'text-slate-900 text-sm font-medium placeholder:text-slate-400',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500',
            'transition-all duration-200',
            Icon && 'pl-10',
            error && 'border-red-500',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-[10px] font-bold text-red-500 uppercase tracking-tighter mt-1">{error}</p>}
    </div>
  );
}

export function Select({
  label,
  options,
  error,
  className,
  ...props
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest">{label}</label>
      )}
      <select
        className={cn(
          'w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white shadow-sm',
          'text-slate-900 text-sm font-medium appearance-none cursor-pointer',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500',
          'transition-all duration-200',
          error && 'border-red-500',
          className
        )}
        {...props}
      >
        {options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-[10px] font-bold text-red-500 uppercase tracking-tighter mt-1">{error}</p>}
    </div>
  );
}

export function Card({
  children,
  className,
  padding = 'md',
}) {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-10',
  };

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-slate-100 shadow-sm',
        paddings[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  variant = 'default',
  className,
}) {
  const variants = {
    default: 'bg-slate-100 text-slate-700',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Table({ columns, data, onRowClick }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-100">
          <tr>
            {columns.map((col, i) => (
              <th
                key={i}
                className="px-6 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {data.map((row, i) => (
            <tr
              key={i}
              onClick={() => onRowClick?.(row)}
              className={cn(
                'hover:bg-slate-50/50 transition-colors',
                onRowClick && 'cursor-pointer'
              )}
            >
              {columns.map((col, j) => (
                <td key={j} className="px-6 py-4 text-sm font-medium text-slate-600">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-6xl',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative bg-white rounded-2xl shadow-2xl w-full mx-auto overflow-hidden',
          'border border-slate-200',
          sizes[size]
        )}
      >
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-white">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-400 hover:text-slate-900"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-8 max-h-[85vh] overflow-y-auto no-scrollbar">{children}</div>
      </div>
    </div>
  );
}

export function Skeleton({ className }) {
  return (
    <div
      className={cn(
        'animate-pulse bg-slate-100 rounded-lg',
        className
      )}
    />
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      {Icon && (
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
          <Icon className="w-10 h-10 text-slate-300" />
        </div>
      )}
      <h3 className="text-lg font-black text-slate-900 mb-2 uppercase tracking-wide">{title}</h3>
      <p className="text-slate-500 mb-8 max-w-sm text-sm font-medium">{description}</p>
      {action}
    </div>
  );
}

export function Toggle({ label, checked, onChange, disabled = false }) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      {label && (
        <span className="text-xs font-black text-slate-700 uppercase tracking-widest">{label}</span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange({ target: { checked: !checked } })}
        className={cn(
          'relative inline-flex h-5 w-10 items-center rounded-full transition-colors',
          'focus:outline-none',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          checked ? 'bg-indigo-600' : 'bg-slate-200'
        )}
      >
        <span
          className={cn(
            'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-6' : 'translate-x-0.5'
          )}
        />
      </button>
    </label>
  );
}

export function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div className="flex gap-1 p-1 bg-slate-50 rounded-xl border border-slate-100 w-fit">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
            activeTab === tab.id
              ? 'bg-white text-indigo-600 shadow-sm border border-slate-100'
              : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
