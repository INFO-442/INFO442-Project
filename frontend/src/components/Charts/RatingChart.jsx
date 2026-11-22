import { useState } from "react"
import { useLanguage } from "@/i18n/LanguageContext.jsx"
import chartCSS from "./RatingChart.module.css"

const width = 560
const height = 260
const pad = { top: 24, right: 24, bottom: 54, left: 30 }

function RatingChart({ series }) {
  const { t } = useLanguage()
  const [active, setActive] = useState(null)

  if (series.length === 0) {
    return <p className={chartCSS.empty}>{t("dashboard.chartEmpty")}</p>
  }

  const points = series.filter((point) => point.avg !== null)

  if (points.length === 0) {
    return <p className={chartCSS.empty}>{t("dashboard.chartEmpty")}</p>
  }

  const plotWidth = width - pad.left - pad.right
  const plotHeight = height - pad.top - pad.bottom
  const xAt = (index) =>
    series.length === 1
      ? pad.left + plotWidth / 2
      : pad.left + (plotWidth / (series.length - 1)) * index
  const yAt = (value) => pad.top + ((5 - value) / 4) * plotHeight
  const bucketWidth = series.length === 1 ? plotWidth : plotWidth / (series.length - 1)
  const labelEvery = Math.max(1, Math.ceil(series.length / 6))

  const segments = []
  let run = []
  series.forEach((point, index) => {
    if (point.avg === null) {
      if (run.length > 1) segments.push(run)
      run = []
      return
    }
    run.push(`${xAt(index)},${yAt(point.avg)}`)
  })
  if (run.length > 1) segments.push(run)

  const activePoint = active === null ? null : series[active]

  return (
    <div className={chartCSS.wrapper}>
      <svg
        className={chartCSS.svg}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={t("dashboard.ratingChart")}
      >
        <path className={chartCSS.baseline} d={`M ${pad.left} ${pad.top} V ${height - pad.bottom} H ${width - pad.right}`} />
        {[1, 2, 3, 4, 5].map((value) => (
          <g key={value}>
            <line
              className={chartCSS.grid}
              x1={pad.left}
              x2={width - pad.right}
              y1={yAt(value)}
              y2={yAt(value)}
            />
            <text className={chartCSS.axis} x={pad.left - 6} y={yAt(value) + 3}>
              {value}
            </text>
          </g>
        ))}

        {segments.map((segment, index) => (
          <polyline key={index} className={chartCSS.line} points={segment.join(" ")} />
        ))}

        {series.map((point, index) =>
          point.avg === null ? null : (
            <circle
              key={index}
              className={chartCSS.dot}
              cx={xAt(index)}
              cy={yAt(point.avg)}
              r={active === index ? 4 : 2}
            />
          ),
        )}

        {series.map((point, index) =>
          (index % labelEvery === 0 && index < series.length - Math.ceil(labelEvery / 2)) || index === series.length - 1 ? (
            <text
              key={`label-${index}`}
              className={chartCSS.axisLabel}
              x={xAt(index)}
              y={height - 28}
              style={{ textAnchor: index === 0 ? 'start' : index === series.length - 1 ? 'end' : 'middle' }}
            >
              {point.isWeek ? (
                <>
                  <tspan x={xAt(index)}>{t("dashboard.weekOf")}</tspan>
                  <tspan x={xAt(index)} dy="20">{point.label}</tspan>
                </>
              ) : point.label}
            </text>
          ) : null,
        )}

        {series.map((point, index) => (
          <rect
            key={`hit-${index}`}
            className={chartCSS.hit}
            x={Math.max(pad.left, xAt(index) - bucketWidth / 2)}
            y={pad.top}
            width={Math.min(width - pad.right, xAt(index) + bucketWidth / 2) - Math.max(pad.left, xAt(index) - bucketWidth / 2)}
            height={plotHeight}
            onMouseEnter={() => setActive(index)}
            onMouseLeave={() => setActive(null)}
            onClick={() => setActive(index)}
            tabIndex={0}
            aria-label={`${point.isWeek ? `${t("dashboard.weekOf")} ${point.label}` : point.label}: ${point.avg === null ? '—' : point.avg.toFixed(1)} ★ · ${point.count} ${t('dashboard.chartResponses')}`}
            onFocus={() => setActive(index)}
            onBlur={() => setActive(null)}
          />
        ))}
      </svg>

      {activePoint && (
        <div className={chartCSS.tooltip} style={{ left: `${Math.max(22, Math.min(78, (xAt(active) / width) * 100))}%` }}>
          <div>{activePoint.isWeek ? `${t("dashboard.weekOf")} ${activePoint.label}` : activePoint.label}</div>
          {activePoint.avg === null ? "—" : activePoint.avg.toFixed(1)} ★ · {activePoint.count}{" "}
          {t("dashboard.chartResponses")}
        </div>
      )}

      {points.length === 1 && <p className={chartCSS.note}>{t("dashboard.chartNoData")}</p>}
    </div>
  )
}

export default RatingChart
