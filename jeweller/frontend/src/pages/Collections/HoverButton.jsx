import { motion } from "motion/react"; // Use "framer-motion" if you aren't using motion/react

export default function HoverButton({ children, className = "", onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{
        scale: 1.05,
        transition: { duration: 0.1 }
      }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className={`group relative inline-flex items-center 
        justify-center overflow-hidden border border-white px-6 py-3 text-xs uppercase tracking-widest font-medium text-gray-900 transition-colors duration-300 cursor-pointer ${className}`}
    >
      {/* Diagonal Fill Layer (Top-Left to Bottom-Right) */}
      <span className="absolute inset-0 bg-black -translate-x-full -translate-y-full group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-300 ease-out z-0 radi rounded-xl" />

      {/* Button Text */}
      <span className="relative z-10 inline-flex items-center justify-center gap-2 transition-colors duration-300 group-hover:text-white">
        {children}
      </span>
    </motion.button>
  );
}