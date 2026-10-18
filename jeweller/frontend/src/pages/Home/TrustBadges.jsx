// Trust badges displayed between Hero and Category sections
const badges = [
  {
    icon: 'diamond',
    title: 'Certified Diamonds',
    description: 'Authentic & ethically sourced',
  },
  {
    icon: 'verified',
    title: 'Lifetime Warranty',
    description: 'Quality you can trust, for a lifetime',
  },
  {
    icon: 'local_shipping',
    title: 'Free Shipping',
    description: 'Complimentary insured shipping worldwide',
  },
];

const TrustBadges = () => {
  return (
    <section className="border-y border-[var(--color-outline-variant)]/30 bg-[var(--color-surface)] py-8">
      <div className="max-w-[var(--spacing-container-max)] mx-auto px-[var(--spacing-margin-mobile)] md:px-[var(--spacing-margin-desktop)]">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 md:gap-4 divide-y md:divide-y-0 md:divide-x divide-[var(--color-outline-variant)]/30">

          {badges.map((badge) => (
            <div
              key={badge.title}
              className="flex items-center gap-4 flex-1 justify-center pt-4 md:pt-0 w-full"
            >
              <span className="material-symbols-outlined text-[var(--color-primary)] text-[32px] font-light select-none">
                {badge.icon}
              </span>
              <div>
                <h3
                  className="text-xs font-semibold tracking-[0.1em] text-[var(--color-on-background)] mb-1 uppercase"
                  style={{ fontFamily: 'var(--font-label)' }}
                >
                  {badge.title}
                </h3>
                <p className="text-sm text-[var(--color-on-surface-variant)]"
                  style={{ fontFamily: 'var(--font-body)' }}>
                  {badge.description}
                </p>
              </div>
            </div>
          ))}

        </div>
      </div>
    </section>
  );
};

export default TrustBadges;
