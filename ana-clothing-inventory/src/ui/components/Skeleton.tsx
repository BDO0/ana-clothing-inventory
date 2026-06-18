// Skeleton — reusable loading placeholders for all pages
// Animates with a subtle pulse to indicate loading state
// Using darker gradient for better visibility on warm backgrounds
import { colors, radii } from "../tokens";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
}

const pulseKeyframes = `
  @keyframes skeleton-pulse {
    0% { opacity: 0.6; }
    50% { opacity: 1; }
    100% { opacity: 0.6; }
  }
`;

function SkeletonBox({
  width = "100%",
  height = 16,
  borderRadius = radii.sm,
  style,
}: SkeletonProps) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: `linear-gradient(90deg, #D8D2CB 25%, #C8C0B8 50%, #D8D2CB 75%)`,
        backgroundSize: "200% 100%",
        animation: "skeleton-pulse 1.5s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

/**
 * Skeleton line — for text placeholders
 */
export function SkeletonLine({
  width = "100%",
  height = 14,
  style,
}: SkeletonProps) {
  return (
    <SkeletonBox
      width={width}
      height={height}
      borderRadius={4}
      style={{ marginBottom: 8, ...style }}
    />
  );
}

/**
 * Skeleton card — mimics Card component shape
 */
export function SkeletonCard({
  height = 120,
  style,
}: SkeletonProps) {
  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radii.xxl,
        padding: 16,
        height,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        ...style,
      }}
    >
      <SkeletonLine width="40%" height={16} />
      <SkeletonLine width="60%" />
      <SkeletonLine width="30%" />
    </div>
  );
}

/**
 * Skeleton for KPI metric boxes
 */
export function SkeletonMetric() {
  return (
    <div>
      <SkeletonLine width="60%" height={12} />
      <SkeletonBox width="50%" height={28} borderRadius={4} style={{ marginTop: 4 }} />
    </div>
  );
}

/**
 * Skeleton for timeline rows
 */
export function SkeletonTimelineRow() {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
      <SkeletonBox width={8} height={8} borderRadius="50%" style={{ flexShrink: 0, marginTop: 4 }} />
      <div style={{ flex: 1 }}>
        <SkeletonLine width="70%" height={12} />
        <SkeletonLine width="40%" height={11} />
      </div>
    </div>
  );
}

/**
 * Inject keyframes once
 */
export function SkeletonStyles() {
  return <style>{pulseKeyframes}</style>;
}

export default SkeletonBox;