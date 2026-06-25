import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export const Button = React.forwardRef(
  ({ className = '', variant = 'default', size = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'bg-gradient-primary text-white hover:opacity-90',
      destructive: 'bg-red-600 text-white hover:bg-red-700',
      outline: 'border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-200',
      secondary:
        'border border-slate-800 bg-slate-900/40 text-slate-300 hover:bg-slate-800 hover:text-white',
      upvoted: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]',
    };
    const sizes = {
      default: 'h-10 px-4 py-2',
      sm: 'h-9 rounded-md px-3',
      lg: 'h-11 rounded-md px-8',
    };
    return (
      <button
        className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);

export const Input = React.forwardRef(({ className = '', type, ...props }, ref) => (
  <input
    type={type}
    className={`input-dark text-sm ${className}`}
    ref={ref}
    {...props}
  />
));

export const Textarea = React.forwardRef(({ className = '', ...props }, ref) => (
  <textarea
    className={`input-dark text-sm min-h-[100px] ${className}`}
    ref={ref}
    {...props}
  />
));

export const Modal = ({ show, onClose, title, children, type = 'info' }) => {
  if (!show) return null;

  const icons = {
    info: <Info className="h-6 w-6 text-neon-cyan" />,
    success: <CheckCircle className="h-6 w-6 text-neon-emerald" />,
    error: <AlertTriangle className="h-6 w-6 text-neon-crimson-hot" />,
  };
  const iconBgs = {
    info: 'bg-neon-cyan/10',
    success: 'bg-neon-emerald/10',
    error: 'bg-neon-crimson-hot/10',
  };

  return (
    <div className="animate-fadeIn fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/35 p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="glass-panel-strong w-full max-w-md p-6 text-slate-800"
      >
        <div className="flex items-start">
          <div
            className={`mr-4 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${iconBgs[type]}`}
          >
            {icons[type]}
          </div>
          <div className="flex-1">
            <h3 className="font-space-grotesk text-lg font-semibold text-slate-900">{title}</h3>
            <div className="mt-2 text-sm text-slate-600">{children}</div>
          </div>
        </div>
        <div className="mt-6 text-right">
          <Button onClick={onClose} className="btn-primary !rounded-xl px-5">
            Close
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export const GlobalSpinner = ({ message = 'Loading…' }) => (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm">
    <div className="glass-panel-strong flex flex-col items-center gap-4 px-10 py-8">
      <Loader2 className="h-12 w-12 animate-spin text-emerald-500 drop-shadow-sm" />
      <p className="text-sm font-medium tracking-wide text-slate-700">{message}</p>
    </div>
  </div>
);

export const Badge = ({ className = '', variant = 'default', children }) => {
  const variants = {
    default: 'badge-default',
    success: 'badge-success',
    warning: 'badge-warning',
    destructive: 'badge-critical',
    critical: 'badge-critical animate-pulse-glow',
    primary:
      'rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase text-emerald-700',
  };
  return (
    <span className={`inline-flex items-center leading-5 ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
