import type { ProfileSnapshot, SmoothPoint } from "../geometry/model";

function svgPath(points: readonly SmoothPoint[], sign: number): string {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(6)} ${(sign * point.y).toFixed(6)}`)
    .join(" ");
}

export function buildSvg(snapshot: ProfileSnapshot): string {
  const yLimit = Math.max(snapshot.extents.maxRadius * 1.24, 0.1);
  const top = svgPath(snapshot.smoothPoints, -1);
  const bottom = svgPath([...snapshot.smoothPoints].reverse(), 1).replace(/^M/, "L");
  const bodyPath = `${top} ${bottom} Z`;
  const stationMarks = snapshot.stationPoints
    .map(
      (point) =>
        `<circle cx="${point.x.toFixed(6)}" cy="${(-point.yTop).toFixed(6)}" r="${(snapshot.state.length / 250).toFixed(6)}" />` +
        `<circle cx="${point.x.toFixed(6)}" cy="${(-point.yBottom).toFixed(6)}" r="${(snapshot.state.length / 250).toFixed(6)}" />`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${(-snapshot.state.length * 0.04).toFixed(6)} ${(-yLimit).toFixed(6)} ${(snapshot.state.length * 1.08).toFixed(6)} ${(2 * yLimit).toFixed(6)}">
  <path d="${bodyPath}" fill="#dff1ee" stroke="#0f766e" stroke-width="${(snapshot.state.length / 350).toFixed(6)}" />
  <line x1="0" y1="0" x2="${snapshot.state.length.toFixed(6)}" y2="0" stroke="#c47a13" stroke-width="${(snapshot.state.length / 550).toFixed(6)}" stroke-dasharray="${(snapshot.state.length / 90).toFixed(6)} ${(snapshot.state.length / 120).toFixed(6)}" />
  <g fill="#2563eb">${stationMarks}</g>
</svg>`;
}
