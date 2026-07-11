import type { ProfilePoint, ProfileSnapshot } from "../geometry/model";

function svgPath(points: readonly ProfilePoint[], ySign: 1 | -1): string {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.s.toFixed(6)} ${(ySign * point.radius).toFixed(6)}`)
    .join(" ");
}

export function buildSvg(snapshot: ProfileSnapshot): string {
  const totalLength = snapshot.extents.totalLength;
  const yLimit = Math.max(snapshot.extents.maxRadius * 1.24, 0.1);
  const top = svgPath(snapshot.smoothPoints, -1);
  const bottom = svgPath([...snapshot.smoothPoints].reverse(), 1).replace(/^M/, "L");
  const bodyPath = `${top} ${bottom} Z`;
  const stationMarkers = snapshot.stationPoints
    .map(
      (point) =>
        `<circle cx="${point.s.toFixed(6)}" cy="${(-point.topRadius).toFixed(6)}" r="${(totalLength / 250).toFixed(6)}" />` +
        `<circle cx="${point.s.toFixed(6)}" cy="${(-point.bottomRadius).toFixed(6)}" r="${(totalLength / 250).toFixed(6)}" />`,
    )
    .join("\n  ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${(-totalLength * 0.04).toFixed(6)} ${(-yLimit).toFixed(6)} ${(totalLength * 1.08).toFixed(6)} ${(2 * yLimit).toFixed(6)}">
  <path d="${bodyPath}" fill="#dff1ee" stroke="#0f766e" stroke-width="${(totalLength / 350).toFixed(6)}" />
  <line x1="0" y1="0" x2="${totalLength.toFixed(6)}" y2="0" stroke="#c47a13" stroke-width="${(totalLength / 550).toFixed(6)}" stroke-dasharray="${(totalLength / 90).toFixed(6)} ${(totalLength / 120).toFixed(6)}" />
  ${stationMarkers}
</svg>`;
}