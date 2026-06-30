const inputs = {
  length: document.querySelector("#length"),
  slenderness: document.querySelector("#slenderness"),
  diameter: document.querySelector("#diameter"),
  stations: document.querySelector("#stations"),
  showGrid: document.querySelector("#show-grid"),
  showPoints: document.querySelector("#show-points"),
};

const canvas = document.querySelector("#profile-canvas");
const tableBody = document.querySelector("#coordinate-rows");
const maxRadiusEl = document.querySelector("#max-radius");
const maxHeightEl = document.querySelector("#max-height");
const maxXEl = document.querySelector("#max-x");
const pointCountEl = document.querySelector("#point-count");

const defaults = {
  length: 6,
  slenderness: 3,
  stations: 20,
};

let lastEdited = "slenderness";
let smoothPoints = [];
let stationPoints = [];

function clampNumber(value, fallback, min, max = Number.POSITIVE_INFINITY) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(Math.max(numeric, min), max);
}

function format(value, digits = 3) {
  return Number(value).toLocaleString("ru-RU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatInput(value) {
  return Number(value.toFixed(4)).toString();
}

function getState() {
  const length = clampNumber(inputs.length.value, defaults.length, 0.1);
  let slenderness = clampNumber(inputs.slenderness.value, defaults.slenderness, 0.1);
  let diameter = clampNumber(inputs.diameter.value, length / slenderness, 0.01);

  if (lastEdited === "diameter") {
    slenderness = length / diameter;
    inputs.slenderness.value = formatInput(slenderness);
  } else {
    diameter = length / slenderness;
    inputs.diameter.value = formatInput(diameter);
  }

  inputs.length.value = formatInput(length);

  return {
    length,
    slenderness,
    diameter,
    stations: Math.round(clampNumber(inputs.stations.value, defaults.stations, 8, 80)),
    showGrid: inputs.showGrid.checked,
    showPoints: inputs.showPoints.checked,
  };
}

function ordinateAt(x, length, diameter) {
  const t = x / length;
  const body = t * (1 - t) * (1 - 0.5 * t);
  return 0.972 * diameter * Math.sqrt(Math.max(0, body));
}

function uniqueSorted(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.filter((value, index) => index === 0 || Math.abs(value - sorted[index - 1]) > 1e-9);
}

function makeStationPoints(length, diameter, stations) {
  const step = length / stations;
  const halfStep = step / 2;
  const xs = [0, halfStep];

  for (let i = 1; i < stations; i += 1) {
    xs.push(i * step);
  }

  xs.push(length - halfStep, length);

  return uniqueSorted(xs).map((x) => {
    const y = ordinateAt(x, length, diameter);
    return { x, yTop: y, yBottom: -y };
  });
}

function makeSmoothPoints(length, diameter) {
  const samples = 320;
  const points = [];
  for (let i = 0; i <= samples; i += 1) {
    const x = (length * i) / samples;
    points.push({ x, y: ordinateAt(x, length, diameter) });
  }
  return points;
}

function getExtents(points) {
  const maxPoint = points.reduce(
    (best, point) => (point.y > best.y ? point : best),
    { x: 0, y: 0 },
  );
  return {
    maxRadius: maxPoint.y,
    maxHeight: maxPoint.y * 2,
    maxX: maxPoint.x,
  };
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
}

function drawGrid(ctx, mapX, mapY, length, yLimit, width, height) {
  ctx.save();
  ctx.strokeStyle = "#e2e8e1";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#6d7a75";
  ctx.font = "12px Segoe UI, Arial, sans-serif";

  for (let i = 0; i <= 10; i += 1) {
    const x = (length * i) / 10;
    const px = mapX(x);
    ctx.beginPath();
    ctx.moveTo(px, 26);
    ctx.lineTo(px, height - 36);
    ctx.stroke();
    ctx.fillText(format(x, 1), px - 10, height - 14);
  }

  for (let i = -4; i <= 4; i += 1) {
    const y = (yLimit * i) / 4;
    const py = mapY(y);
    ctx.beginPath();
    ctx.moveTo(42, py);
    ctx.lineTo(width - 24, py);
    ctx.stroke();
    if (i !== 0) ctx.fillText(format(y, 1), 8, py + 4);
  }

  ctx.restore();
}

function drawProfile(state) {
  resizeCanvas();
  const ctx = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.width / ratio;
  const height = canvas.height / ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const extents = getExtents(smoothPoints);
  const yLimit = Math.max(extents.maxRadius * 1.24, state.diameter * 0.08, 0.1);
  const padding = { left: 54, right: 28, top: 30, bottom: 48 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const scale = Math.min(innerW / state.length, innerH / (2 * yLimit));
  const drawingW = state.length * scale;
  const drawingH = 2 * yLimit * scale;
  const originX = padding.left + (innerW - drawingW) / 2;
  const originY = padding.top + innerH / 2;
  const mapX = (x) => originX + x * scale;
  const mapY = (y) => originY - y * scale;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  if (state.showGrid) {
    drawGrid(ctx, mapX, mapY, state.length, yLimit, width, height);
  }

  ctx.save();
  ctx.strokeStyle = "#c47a13";
  ctx.lineWidth = 1.4;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(mapX(0), mapY(0));
  ctx.lineTo(mapX(state.length), mapY(0));
  ctx.stroke();
  ctx.restore();

  const shape = new Path2D();
  smoothPoints.forEach((point, index) => {
    const px = mapX(point.x);
    const py = mapY(point.y);
    if (index === 0) shape.moveTo(px, py);
    else shape.lineTo(px, py);
  });
  [...smoothPoints].reverse().forEach((point) => {
    shape.lineTo(mapX(point.x), mapY(-point.y));
  });
  shape.closePath();

  ctx.fillStyle = "rgba(15, 118, 110, 0.12)";
  ctx.strokeStyle = "#0f766e";
  ctx.lineWidth = 2.4;
  ctx.fill(shape);
  ctx.stroke(shape);

  if (state.showPoints) {
    ctx.fillStyle = "#2563eb";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    stationPoints.forEach((point) => {
      for (const y of [point.yTop, point.yBottom]) {
        ctx.beginPath();
        ctx.arc(mapX(point.x), mapY(y), 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    });
  }

  ctx.fillStyle = "#17212b";
  ctx.font = "600 13px Segoe UI, Arial, sans-serif";
  ctx.fillText("L", mapX(state.length) - 8, mapY(0) - 10);
  ctx.fillText("x", mapX(state.length) + 10, mapY(0) + 4);
  ctx.fillText("y", mapX(0) - 22, mapY(yLimit) + 4);
}

function renderTable() {
  tableBody.innerHTML = stationPoints
    .map(
      (point, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${format(point.x, 4)}</td>
          <td>${format(point.yTop, 4)}</td>
          <td>${format(point.yBottom, 4)}</td>
        </tr>
      `,
    )
    .join("");
  pointCountEl.textContent = `${stationPoints.length} точек`;
}

function updateMetrics() {
  const extents = getExtents(smoothPoints);
  maxRadiusEl.textContent = format(extents.maxRadius, 4);
  maxHeightEl.textContent = format(extents.maxHeight, 4);
  maxXEl.textContent = format(extents.maxX, 4);
}

function update(source = lastEdited) {
  lastEdited = source;
  const state = getState();
  inputs.stations.value = state.stations;
  smoothPoints = makeSmoothPoints(state.length, state.diameter);
  stationPoints = makeStationPoints(state.length, state.diameter, state.stations);
  drawProfile(state);
  renderTable();
  updateMetrics();
}

function download(filename, mimeType, content) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function svgPath(points, sign) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(6)} ${(sign * point.y).toFixed(6)}`)
    .join(" ");
}

function buildSvg() {
  const state = getState();
  const extents = getExtents(smoothPoints);
  const yLimit = Math.max(extents.maxRadius * 1.24, 0.1);
  const top = svgPath(smoothPoints, -1);
  const bottom = svgPath([...smoothPoints].reverse(), 1).replace(/^M/, "L");
  const bodyPath = `${top} ${bottom} Z`;
  const stationMarks = stationPoints
    .map(
      (point) =>
        `<circle cx="${point.x.toFixed(6)}" cy="${(-point.yTop).toFixed(6)}" r="${(state.length / 250).toFixed(6)}" />` +
        `<circle cx="${point.x.toFixed(6)}" cy="${(-point.yBottom).toFixed(6)}" r="${(state.length / 250).toFixed(6)}" />`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${(-state.length * 0.04).toFixed(6)} ${(-yLimit).toFixed(6)} ${(state.length * 1.08).toFixed(6)} ${(2 * yLimit).toFixed(6)}">
  <path d="${bodyPath}" fill="#dff1ee" stroke="#0f766e" stroke-width="${(state.length / 350).toFixed(6)}" />
  <line x1="0" y1="0" x2="${state.length.toFixed(6)}" y2="0" stroke="#c47a13" stroke-width="${(state.length / 550).toFixed(6)}" stroke-dasharray="${(state.length / 90).toFixed(6)} ${(state.length / 120).toFixed(6)}" />
  <g fill="#2563eb">${stationMarks}</g>
</svg>`;
}

function buildCsv() {
  const rows = [["N", "x", "y_top", "y_bottom"]];
  stationPoints.forEach((point, index) => {
    rows.push([index + 1, point.x, point.yTop, point.yBottom]);
  });
  return rows.map((row) => row.join(";")).join("\n");
}

inputs.length.addEventListener("input", () => update(lastEdited));
inputs.slenderness.addEventListener("input", () => update("slenderness"));
inputs.diameter.addEventListener("input", () => update("diameter"));
inputs.stations.addEventListener("input", () => update(lastEdited));
inputs.showGrid.addEventListener("change", () => update(lastEdited));
inputs.showPoints.addEventListener("change", () => update(lastEdited));
window.addEventListener("resize", () => update(lastEdited));

document.querySelector("#download-svg").addEventListener("click", () => {
  download("airship-profile.svg", "image/svg+xml;charset=utf-8", buildSvg());
});

document.querySelector("#download-csv").addEventListener("click", () => {
  download("airship-profile.csv", "text/csv;charset=utf-8", buildCsv());
});

document.querySelector("#reset").addEventListener("click", () => {
  inputs.length.value = defaults.length;
  inputs.slenderness.value = defaults.slenderness;
  inputs.stations.value = defaults.stations;
  inputs.showGrid.checked = true;
  inputs.showPoints.checked = true;
  lastEdited = "slenderness";
  update("slenderness");
});

update("slenderness");
