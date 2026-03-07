interface TarsierEyeLogoProps {
  size?: number;
}

function TarsierEyeLogo({ size = 32 }: TarsierEyeLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="tarsier-eye-glow text-primary"
    >
      {/* Outer eye shape */}
      <ellipse
        cx="16"
        cy="16"
        rx="14"
        ry="11"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Iris */}
      <circle cx="16" cy="16" r="7.5" fill="var(--color-base)" stroke="currentColor" strokeWidth="1" />
      {/* Pupil */}
      <circle cx="16" cy="16" r="4" fill="currentColor" />
      {/* Inner highlight */}
      <circle cx="14" cy="14.5" r="1.5" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

export default TarsierEyeLogo;
