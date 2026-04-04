const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
})

const integerFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
})

export function formatCurrency(
  value: number | null | undefined,
  options: {
    currency?: string
    compact?: boolean
    maximumFractionDigits?: number
  } = {}
) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "N/A"
  }

  if (options.compact) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: options.currency ?? "USD",
      notation: "compact",
      maximumFractionDigits: options.maximumFractionDigits ?? 2,
    }).format(value)
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: options.currency ?? "USD",
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  }).format(value)
}

export function formatCompactNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "N/A"
  }

  return compactNumberFormatter.format(value)
}

export function formatInteger(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "N/A"
  }

  return integerFormatter.format(value)
}

export function formatPercent(
  value: number | null | undefined,
  options: { decimals?: number; scale?: "fraction" | "percent" } = {}
) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "N/A"
  }

  const normalized = options.scale === "fraction" ? value : value / 100

  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: options.decimals ?? 2,
    minimumFractionDigits: options.decimals ?? 0,
  }).format(normalized)
}

export function formatSignedNumber(
  value: number | null | undefined,
  options: { digits?: number } = {}
) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "N/A"
  }

  return new Intl.NumberFormat("en-US", {
    signDisplay: "exceptZero",
    maximumFractionDigits: options.digits ?? 2,
    minimumFractionDigits: options.digits ?? 0,
  }).format(value)
}

export function formatNumber(
  value: number | null | undefined,
  options: { digits?: number; minimumDigits?: number } = {}
) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "N/A"
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: options.digits ?? 2,
    minimumFractionDigits: options.minimumDigits ?? options.digits ?? 0,
  }).format(value)
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return "N/A"
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed)
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "N/A"
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed)
}

export function formatMetricValue(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return "N/A"
  }

  if (typeof value === "string") {
    return value
  }

  if (Math.abs(value) >= 1_000_000) {
    return formatCompactNumber(value)
  }

  if (Math.abs(value) <= 1 && value !== 0) {
    return value.toFixed(2)
  }

  return formatNumber(value)
}

function isFractionalPercentMetricLabel(label: string) {
  return (
    label === "FCF Yield" ||
    label === "Dividend Yield" ||
    label === "Payout Ratio" ||
    label === "ROE" ||
    label === "ROIC" ||
    label.endsWith(" Margin") ||
    label.endsWith(" Growth")
  )
}

export function formatLabeledMetricValue(
  label: string,
  value: number | string | null | undefined
) {
  if (typeof value === "number" && isFractionalPercentMetricLabel(label)) {
    return formatPercent(value, { scale: "fraction" })
  }

  return formatMetricValue(value)
}
