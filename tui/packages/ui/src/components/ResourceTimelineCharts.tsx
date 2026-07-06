import { TextAttributes, type BoxRenderable } from '@opentui/core';
import { For, createMemo, createSignal } from 'solid-js';
import { uiColors } from '../colors';

export interface TimelineMetric {
  title: string;
  value: string;
  values: number[];
  color: string;
}

export interface ResourceTimelineChartsProps {
  cpu: TimelineMetric;
  memory: TimelineMetric;
  /** Fixed width reserved for labels on the left. Defaults to 16 columns. */
  labelWidth?: number;
  /** Gap between label column and chart. Defaults to 1 column. */
  labelGap?: number;
  /** Horizontal padding inside the component. Defaults to 1 column each side. */
  paddingX?: number;
  /** Scale chart to visible data range. Defaults to false; fixed 0–100 keeps values comparable. */
  autoScale?: boolean;
}

interface Size {
  width: number;
  height: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function padOrTrim(value: string, width: number): string {
  if (width <= 0) return '';
  if (value.length > width) return value.slice(0, width);
  return value.padEnd(width, ' ');
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const value = hex.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(value)) {
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16),
    };
  }
  return { r: 255, g: 255, b: 255 };
}

function visibleValues(values: number[], cellWidth: number): number[] {
  const safeWidth = Math.max(1, cellWidth);
  const display = values.length > safeWidth ? values.slice(-safeWidth) : values;
  const pad = safeWidth - display.length;
  return [...Array.from({ length: pad }, () => NaN), ...display];
}

function valueRange(values: number[], autoScale: boolean): { min: number; max: number } {
  const realValues = values.filter((value) => Number.isFinite(value));
  if (!autoScale || realValues.length === 0) return { min: 0, max: 100 };

  let min = Math.min(...realValues);
  let max = Math.max(...realValues);
  const range = max - min;

  if (range < 0.1) {
    min -= 0.5;
    max += 0.5;
  } else {
    const pad = range * 0.08;
    min -= pad;
    max += pad;
  }

  return { min: clamp(min, 0, 100), max: clamp(max, 0, 100) };
}

function sampleValue(values: number[], pixelX: number, pixelWidth: number): number {
  if (values.length === 0) return NaN;
  const cellX = pixelX / 2;
  const left = Math.floor(cellX);
  const right = Math.min(values.length - 1, left + 1);
  const t = cellX - left;
  const a = values[left];
  const b = values[right];
  if (!Number.isFinite(a)) return NaN;
  if (!Number.isFinite(b)) return a;
  if (pixelWidth <= 2) return a;
  return a + (b - a) * t;
}

function makePixelBuffer(values: number[], cellWidth: number, cellHeight: number, color: string, autoScale: boolean): Uint8Array {
  const safeCellWidth = Math.max(1, cellWidth);
  const safeCellHeight = Math.max(1, cellHeight);
  const pixelWidth = safeCellWidth * 2;
  const pixelHeight = safeCellHeight * 2;
  const pixels = new Uint8Array(pixelWidth * pixelHeight * 4);
  const fg = hexToRgb(color);
  const bg = hexToRgb(uiColors.bgMantle);
  const display = visibleValues(values, safeCellWidth);
  const range = valueRange(display, autoScale);
  const span = Math.max(0.1, range.max - range.min);

  for (let y = 0; y < pixelHeight; y++) {
    for (let x = 0; x < pixelWidth; x++) {
      const value = sampleValue(display, x, pixelWidth);
      const idx = (y * pixelWidth + x) * 4;
      let r = bg.r;
      let g = bg.g;
      let b = bg.b;

      if (Number.isFinite(value)) {
        const normalized = clamp((value - range.min) / span, 0, 1);
        const yFromBottom = pixelHeight - 1 - y;
        const lineY = normalized * (pixelHeight - 1);
        const distance = Math.abs(yFromBottom - lineY);
        const strokeRadius = 0.55;
        const alpha = clamp(1 - distance / strokeRadius, 0, 1);
        if (alpha > 0) {
          r = bg.r + (fg.r - bg.r) * alpha;
          g = bg.g + (fg.g - bg.g) * alpha;
          b = bg.b + (fg.b - bg.b) * alpha;
        }
      }

      pixels[idx] = Math.round(r);
      pixels[idx + 1] = Math.round(g);
      pixels[idx + 2] = Math.round(b);
      pixels[idx + 3] = 255;
    }
  }

  return pixels;
}

function renderMetricPixels(metric: TimelineMetric, autoScale: boolean) {
  return function renderAfter(this: BoxRenderable, buffer: any) {
    const width = Math.max(1, this.width ?? 0);
    const height = Math.max(1, this.height ?? 0);
    const pixels = makePixelBuffer(metric.values, width, height, metric.color, autoScale);
    buffer.drawSuperSampleBuffer(
      this.screenX,
      this.screenY,
      pixels,
      pixels.length,
      'rgba8unorm',
      width * 2 * 4,
    );
  };
}

function labelFor(metric: TimelineMetric, row: number, rows: number, width: number): string {
  if (rows <= 1) return padOrTrim(metric.title, width);
  if (row === 0) return padOrTrim(metric.title, width);
  if (row === 1) return padOrTrim(metric.value, width);
  return ' '.repeat(Math.max(0, width));
}

export function ResourceTimelineCharts(props: ResourceTimelineChartsProps) {
  let root: BoxRenderable | undefined;
  const [size, setSize] = createSignal<Size>({ width: 0, height: 0 });
  const labelWidth = () => props.labelWidth ?? 16;
  const labelGap = () => props.labelGap ?? 1;
  const paddingX = () => props.paddingX ?? 1;
  const autoScale = () => props.autoScale ?? false;

  const updateSize = () => {
    if (!root) return;
    const next = {
      width: Math.max(0, root.width ?? 0),
      height: Math.max(0, root.height ?? 0),
    };
    const current = size();
    if (next.width !== current.width || next.height !== current.height) {
      setSize(next);
    }
  };

  const metricRows = createMemo(() => Math.max(1, Math.floor(Math.max(2, size().height) / 2)));
  const graphWidth = createMemo(() =>
    Math.max(1, size().width - paddingX() * 2 - labelWidth() - labelGap()),
  );

  const renderMetric = (metric: TimelineMetric) => (
    <box style={{ width: '100%', height: metricRows(), flexDirection: 'row', paddingLeft: paddingX(), paddingRight: paddingX(), flexShrink: 0 }}>
      <box style={{ width: labelWidth(), height: '100%', flexDirection: 'column', flexShrink: 0 }}>
        <For each={Array.from({ length: metricRows() })}>
          {(_, index) => (
            <box style={{ width: '100%', height: 1, flexShrink: 0 }}>
              <text
                fg={index() === 0 ? uiColors.textMuted : uiColors.textSecondary}
                attributes={index() === 0 ? TextAttributes.BOLD : undefined}
              >
                {labelFor(metric, index(), metricRows(), labelWidth())}
              </text>
            </box>
          )}
        </For>
      </box>
      <box style={{ width: labelGap(), height: '100%', flexShrink: 0 }} />
      <box
        renderAfter={renderMetricPixels(metric, autoScale())}
        backgroundColor={uiColors.bgMantle}
        style={{ width: graphWidth(), height: metricRows(), flexShrink: 0, overflow: 'hidden' }}
      />
    </box>
  );

  return (
    <box
      ref={(r: BoxRenderable) => {
        root = r;
        queueMicrotask(updateSize);
      }}
      onSizeChange={updateSize}
      style={{ width: '100%', flexGrow: 1, minHeight: 0, flexDirection: 'column', overflow: 'hidden' }}
    >
      {renderMetric(props.cpu)}
      {renderMetric(props.memory)}
    </box>
  );
}
