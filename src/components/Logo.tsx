export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const box = size === "lg" ? "size-11 rounded-xl" : "size-8 rounded-lg";
  const icon = size === "lg" ? 22 : 17;
  return (
    <div
      aria-hidden
      className={`${box} flex shrink-0 items-center justify-center bg-gradient-to-br from-[#3a63ec] to-[#2442a8] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_1px_2px_rgb(36_66_168/0.35)]`}
    >
      <svg width={icon} height={icon} viewBox="0 0 24 24" fill="none">
        <rect x="3.5" y="7" width="17" height="12.5" rx="2.5" stroke="currentColor" strokeWidth="1.9" />
        <path d="M9 7V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V7" stroke="currentColor" strokeWidth="1.9" />
        <path d="m8.8 13.2 2.2 2.2 4.3-4.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
