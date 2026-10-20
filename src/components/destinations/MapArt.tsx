import type { AirportCode } from "@/content/airports";
import { cityPoints, graticule, landPaths, MAP_SIZE, routePaths, seaPaths } from "@/lib/map-geometry";

interface MapArtProps {
  /** Highlight routes touching this city. */
  active?: AirportCode | null;
  /** Show the little planes that fly the routes (hidden for reduced motion via CSS). */
  planes?: boolean;
  /** Show city code labels inside the SVG (the interactive map uses HTML buttons instead). */
  labels?: boolean;
  className?: string;
}

/**
 * The static route-map illustration. Routes draw themselves via CSS when the wrapping
 * <Reveal> wrapper scrolls into view; with reduced motion they are simply drawn.
 */
export function MapArt({ active = null, planes = true, labels = false, className }: MapArtProps) {
  const { width, height } = MAP_SIZE;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect width={width} height={height} fill="var(--map-sea)" />
      <g stroke="var(--map-grid)" strokeWidth="1">
        {graticule.meridians.map((x) => (
          <line key={`m${x}`} x1={x} x2={x} y1={0} y2={height} />
        ))}
        {graticule.parallels.map((y) => (
          <line key={`p${y}`} x1={0} x2={width} y1={y} y2={y} />
        ))}
      </g>
      <line
        x1={0}
        x2={width}
        y1={graticule.equator}
        y2={graticule.equator}
        stroke="var(--map-coast)"
        strokeDasharray="4 6"
      />
      <g fill="var(--map-land)" stroke="var(--map-coast)" strokeWidth="1.2" strokeLinejoin="round">
        {landPaths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <g fill="var(--map-sea)" stroke="var(--map-coast)" strokeWidth="1.2" strokeLinejoin="round">
        {seaPaths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>

      <g fill="none" strokeLinecap="round">
        {routePaths.map((route, i) => {
          const lit = !active || route.from === active || route.to === active;
          return (
            <g key={route.id} style={{ opacity: lit ? 1 : 0.25, transition: "opacity 0.4s" }}>
              <path d={route.d} stroke="var(--map-route)" strokeOpacity="0.18" strokeWidth="7" />
              <path
                id={`route-${route.id}`}
                d={route.d}
                pathLength={1}
                className="route-line"
                style={{ ["--i" as string]: i }}
                stroke="var(--map-route)"
                strokeWidth={active && lit ? 3 : 2.2}
              />
            </g>
          );
        })}
      </g>

      {planes &&
        routePaths.map((route, i) => (
          <g key={`plane-${route.id}`} className="map-plane" opacity="0">
            <path
              d="M-7 -2.2 L4 -0.8 L8 0 L4 0.8 L-7 2.2 L-5 0 Z M-1 0 L-4 -6 L-2 -6 L3 0 L-2 6 L-4 6 Z"
              fill="var(--ink)"
            />
            <animateMotion
              dur={`${6 + (i % 3) * 1.5}s`}
              begin={`${2 + i * 0.6}s`}
              repeatCount="indefinite"
              rotate="auto"
              keyPoints={i % 2 ? "1;0" : "0;1"}
              keyTimes="0;1"
              calcMode="linear"
            >
              <mpath href={`#route-${route.id}`} />
            </animateMotion>
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              keyTimes="0;0.1;0.9;1"
              dur={`${6 + (i % 3) * 1.5}s`}
              begin={`${2 + i * 0.6}s`}
              repeatCount="indefinite"
            />
          </g>
        ))}

      {cityPoints.map((city) => {
        const on = active === city.code;
        return (
          <g key={city.code} transform={`translate(${city.x} ${city.y})`}>
            <circle r="6" fill="var(--map-route)" className="pulse-ring" opacity="0.5" />
            <circle r={on ? 7 : 5} fill="var(--bg)" stroke="var(--map-route)" strokeWidth="3" />
            {labels && (
              <text
                x={city.code === "PHC" ? 10 : -10}
                y={city.code === "PHC" ? 18 : -12}
                textAnchor={city.code === "PHC" ? "start" : "end"}
                fontSize="16"
                fontWeight="700"
                fill="var(--ink)"
              >
                {city.code}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
