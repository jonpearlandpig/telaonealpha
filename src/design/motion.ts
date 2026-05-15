export const motion = {
  fadeInUp: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
  calmSpring: {
    type: 'spring',
    stiffness: 140,
    damping: 22,
    mass: 0.8,
  },
} as const
