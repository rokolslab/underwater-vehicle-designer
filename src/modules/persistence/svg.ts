import type { ProfilePoint, ProfileSnapshot } from "../geometry/model";
import { bodyXFromProfileS } from "../../shared/body-coordinates";
import { logger } from "../../shared/logger";
import { bodyPointToXzProjection } from "../rendering/coordinate-adapter";

function projectProfilePoint(point: ProfilePoint, zSign: 1 | -1, totalLength: number): { right: number; down: number } {
  return bodyPointToXzProjection({
    x: bodyXFromProfileS(point.s, totalLength),
    y: 0,
    z: zSign * point.radius,
  });
}

function svgPath(points: readonly ProfilePoint[], zSign: 1 | -1, totalLength: number): string {
  return points
    .map((point, index) => {
      const projected = projectProfilePoint(point, zSign, totalLength);
      return `${index === 0 ? "M" : "L"}${projected.right.toFixed(6)} ${projected.down.toFixed(6)}`;
    })
    .join(" ");
}

export function buildSvg(snapshot: ProfileSnapshot): string {
  const totalLength = snapshot.extents.totalLength;
  const yLimit = Math.max(snapshot.extents.maxRadius * 1.24, 0.1);
  const top = svgPath(snapshot.smoothPoints, -1, totalLength);
  const bottom = svgPath([...snapshot.smoothPoints].reverse(), 1, totalLength).replace(/^M/, "L");
  const bodyPath = `${top} ${bottom} Z`;
  const stationMarkers = snapshot.stationPoints
    .map((point) => {
      const topPoint = bodyPointToXzProjection({ x: bodyXFromProfileS(point.s, totalLength), y: 0, z: -point.topRadius });
      const bottomPoint = bodyPointToXzProjection({ x: bodyXFromProfileS(point.s, totalLength), y: 0, z: -point.bottomRadius });
      return `<circle cx="${topPoint.right.toFixed(6)}" cy="${topPoint.down.toFixed(6)}" r="${(totalLength / 250).toFixed(6)}" />` +
        `<circle cx="${bottomPoint.right.toFixed(6)}" cy="${bottomPoint.down.toFixed(6)}" r="${(totalLength / 250).toFixed(6)}" />`;
    })
    .join("\n  ");

  if (snapshot.smoothPoints.length < 2 || totalLength <= 0) {
    logger.warn("XZ profile SVG has empty or invalid geometry", {
      exportView: "profile", projectionFrame: "Body/XZ", totalLength,
      pointCount: snapshot.smoothPoints.length,
    });
  }
  logger.debug("XZ profile SVG built", {
    exportView: "profile", projectionFrame: "Body/XZ",
    bodyXRange: [-totalLength / 2, totalLength / 2],
    bodyZRange: [-snapshot.extents.maxRadius, snapshot.extents.maxRadius],
    pointCount: snapshot.smoothPoints.length,
    stationCount: snapshot.stationPoints.length,
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${(-totalLength * 0.54).toFixed(6)} ${(-yLimit).toFixed(6)} ${(totalLength * 1.08).toFixed(6)} ${(2 * yLimit).toFixed(6)}">
  <path d="${bodyPath}" fill="#dff1ee" stroke="#0f766e" stroke-width="${(totalLength / 350).toFixed(6)}" />
  <line x1="${(-totalLength / 2).toFixed(6)}" y1="0" x2="${(totalLength / 2).toFixed(6)}" y2="0" stroke="#c47a13" stroke-width="${(totalLength / 550).toFixed(6)}" stroke-dasharray="${(totalLength / 90).toFixed(6)} ${(totalLength / 120).toFixed(6)}" />
  <text x="${(totalLength / 2).toFixed(6)}" y="${(-yLimit * 0.86).toFixed(6)}" text-anchor="end">нос (+X)</text>
  <text x="${(-totalLength / 2).toFixed(6)}" y="${(-yLimit * 0.86).toFixed(6)}">корма</text>
  <text x="0" y="${(yLimit * 0.94).toFixed(6)}">+Z вниз</text>
  ${stationMarkers}
</svg>`;
}
