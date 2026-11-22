import { useLanguage } from "@/i18n/LanguageContext.jsx"
import chartCSS from "./SentimentChart.module.css"

const order = ["positive", "neutral", "negative"]

function SentimentChart({ counts, onSelect }) {
  const { t } = useLanguage()
  const total = order.reduce((sum, key) => sum + counts[key], 0)

  if (total === 0) {
    return <p className={chartCSS.empty}>{t("dashboard.chartEmpty")}</p>
  }

  const max = Math.max(...order.map((key) => counts[key]), 1)

  return (
    <svg className={chartCSS.bars} viewBox="0 0 560 260" role="group" aria-label={t('dashboard.sentimentChart')}>
      <line className={chartCSS.baseline} x1="30" x2="536" y1="218" y2="218" />
      {order.map((key, index) => (
        <g
          key={key}
          role="button"
          tabIndex={0}
          className={chartCSS.bar}
          onClick={() => onSelect(key)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onSelect(key)
            }
          }}
          aria-label={`${t(`dashboard.sentiment.${key}`)}: ${counts[key]} (${Math.round(counts[key] / total * 100)}%)`}
        >
          <title>{`${counts[key]} · ${Math.round(counts[key] / total * 100)}%`}</title>
          <rect className={chartCSS.hit} x={30 + index * 168.5} y="12" width="168.5" height="246" />
          <rect className={`${chartCSS.fill} ${chartCSS[key]}`} x={68 + index * 168.5}
            y={218 - counts[key] / max * 174} width="92" height={counts[key] / max * 174} rx="4" />
          <text className={chartCSS.count} x={114 + index * 168.5} y={208 - counts[key] / max * 174}>{counts[key]}</text>
          <text className={chartCSS.label} x={114 + index * 168.5} y="254">{t(`dashboard.sentiment.${key}`)}</text>
        </g>
      ))}
    </svg>
  )
}

export default SentimentChart
