import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: ReactNode;
  className?: string;
  animate?: boolean;
}

export function Card({ children, className = '', animate = false }: CardProps) {
  const base = `bg-slate-800 rounded-lg border border-slate-700 p-3 ${className}`;
  if (animate) {
    return (
      <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={base}>
        {children}
      </motion.div>
    );
  }
  return <div className={base}>{children}</div>;
}
