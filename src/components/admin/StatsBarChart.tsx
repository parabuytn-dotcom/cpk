type Bar = { label: string; value: number };

// Evenly spaced hues across the spectrum, red to violet — same idea as R's
// rainbow() palette used in the reference chart, just picked by hand for 6 bars.
const HUES = [0, 30, 55, 130, 195, 260];

function wrapLabel(label: string): string[] {
  const words = label.split(" ");
  if (words.length <= 1) return [label];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

export default function StatsBarChart({ bars }: { bars: Bar[] }) {
  const width = 720;
  const height = 380;
  const marginLeft = 44;
  const marginRight = 16;
  const marginTop = 24;
  const marginBottom = 56;
  const plotWidth = width - marginLeft - marginRight;
  const plotHeight = height - marginTop - marginBottom;

  const maxVal = Math.max(...bars.map((b) => b.value), 1);
  const niceMax = Math.max(5, Math.ceil(maxVal / 5) * 5);
  const ticks = [0, niceMax / 4, niceMax / 2, (niceMax * 3) / 4, niceMax];

  const barGap = 18;
  const barWidth = (plotWidth - barGap * (bars.length - 1)) / bars.length;

  const yFor = (value: number) => marginTop + plotHeight * (1 - value / niceMax);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Statistiques">
      <line
        x1={marginLeft}
        y1={marginTop}
        x2={marginLeft}
        y2={marginTop + plotHeight}
        stroke="currentColor"
        className="text-foreground/50"
      />
      <line
        x1={marginLeft}
        y1={marginTop + plotHeight}
        x2={marginLeft + plotWidth}
        y2={marginTop + plotHeight}
        stroke="currentColor"
        className="text-foreground/50"
      />

      {ticks.map((tick) => {
        const y = yFor(tick);
        return (
          <g key={tick}>
            <line x1={marginLeft - 4} y1={y} x2={marginLeft} y2={y} stroke="currentColor" className="text-foreground/50" />
            <text x={marginLeft - 8} y={y + 4} textAnchor="end" fontSize="11" fill="currentColor" className="text-foreground/60">
              {Math.round(tick)}
            </text>
          </g>
        );
      })}

      {bars.map((bar, i) => {
        const x = marginLeft + i * (barWidth + barGap);
        const barHeight = plotHeight * (bar.value / niceMax);
        const y = marginTop + plotHeight - barHeight;
        const hue = HUES[i % HUES.length];
        const patternId = `stats-hatch-${i}`;

        return (
          <g key={bar.label}>
            <defs>
              <pattern id={patternId} patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                <rect width="6" height="6" fill="white" />
                <line x1="0" y1="0" x2="0" y2="6" stroke={`hsl(${hue} 75% 48%)`} strokeWidth="2.5" />
              </pattern>
            </defs>

            <rect
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barHeight, 0)}
              fill={`url(#${patternId})`}
              stroke={`hsl(${hue} 75% 42%)`}
              strokeWidth="1.5"
            />

            <text
              x={x + barWidth / 2}
              y={y - 8}
              textAnchor="middle"
              fontSize="13"
              fontWeight="700"
              fill="currentColor"
              className="text-foreground"
            >
              {bar.value}
            </text>

            {wrapLabel(bar.label).map((line, lineIndex) => (
              <text
                key={line}
                x={x + barWidth / 2}
                y={marginTop + plotHeight + 20 + lineIndex * 14}
                textAnchor="middle"
                fontSize="11"
                fill="currentColor"
                className="text-foreground/70"
              >
                {line}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
