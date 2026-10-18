import { motion } from "framer-motion";
import HoverButton from "./HoverButton"; // Importing HoverButton

const CollectionCard = ({ item }) => {
  if (!item) return null; // Safety guard to prevent undefined errors

  return (
    <div
      className={`flex flex-col md:flex-row items-center gap-10 md:gap-16 ${
        item.reverse ? "md:flex-row-reverse" : ""
      }`}
    >
      {/* Text Block */}
      <motion.div
        initial={{ opacity: 0, x: item.reverse ? 50 : -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex-1 space-y-4 text-left"
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#75593A] block">
          {item.subtitle}
        </span>

        <h3
          className="text-3xl md:text-4xl font-serif text-gray-900 tracking-tight"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {item.title}
        </h3>

        <p className="text-gray-500 text-sm leading-relaxed max-w-md">
          {item.description}
        </p>

        <div className="pt-2">
          {/* 👇 HOVER BUTTON INTEGRATION HERE */}
          <HoverButton className={item.buttonStyle}>
            {item.buttonText}
          </HoverButton>
        </div>
      </motion.div>

      {/* Image Block */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        className="flex-1 w-full h-[380px] md:h-[450px] overflow-hidden bg-gray-50 shadow-sm"
      >
        <motion.img
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.4 }}
          src={item.image}
          alt={item.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = '/images/categories/necklaces.webp';
          }}
        />

      </motion.div>
    </div>
  );
};

export default CollectionCard; // Exporting single card component