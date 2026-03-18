import { useState, useMemo } from 'react'

function formatCurrency(n) {
  const num = parseFloat(n) || 0
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(num)
}

export default function FinancingCalc({ priceMin, priceMax }) {
  const defaultPrice = priceMin ? parseFloat(priceMin) : (priceMax ? parseFloat(priceMax) : 0)
  const [price, setPrice] = useState(defaultPrice || '')
  const [advance, setAdvance] = useState('')
  const [installments, setInstallments] = useState(24)
  const [rate, setRate] = useState(45)

  const maxAdvance = parseFloat(price) || 0

  const result = useMemo(() => {
    const p = parseFloat(price) || 0
    const adv = parseFloat(advance) || 0
    const principal = Math.max(0, p - adv)
    const n = parseInt(installments)
    const annualRate = parseFloat(rate) / 100
    const monthlyRate = annualRate / 12

    if (principal <= 0 || n <= 0) return null

    let monthlyPayment
    if (monthlyRate === 0) {
      monthlyPayment = principal / n
    } else {
      // French amortization formula
      monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1)
    }

    const totalPayment = monthlyPayment * n + adv
    const totalInterest = totalPayment - p

    return { monthlyPayment, totalPayment, totalInterest }
  }, [price, advance, installments, rate])

  const advancePercent = maxAdvance > 0 ? Math.round(((parseFloat(advance) || 0) / maxAdvance) * 100) : 0

  return (
    <div className="form-section">
      <div className="form-section-title">Calculadora de Financiamiento</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Price */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: 12 }}>Precio del vehículo ($)</label>
          <input
            type="number"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="Ingresá el precio"
            style={{ height: 36 }}
          />
        </div>

        {/* Advance */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label style={{ fontSize: 12 }}>Anticipo ($)</label>
            {maxAdvance > 0 && (
              <span style={{ fontSize: 11, color: 'var(--accent)' }}>{advancePercent}%</span>
            )}
          </div>
          <input
            type="range"
            min={0}
            max={maxAdvance}
            step={maxAdvance / 100 || 1000}
            value={parseFloat(advance) || 0}
            onChange={e => setAdvance(e.target.value)}
            style={{ width: '100%', accentColor: 'var(--accent)', marginBottom: 6 }}
          />
          <input
            type="number"
            value={advance}
            onChange={e => setAdvance(e.target.value)}
            placeholder="0"
            style={{ height: 36 }}
          />
        </div>

        {/* Installments + Rate */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: 12 }}>Cuotas</label>
            <select value={installments} onChange={e => setInstallments(e.target.value)} style={{ height: 36 }}>
              <option value={12}>12 meses</option>
              <option value={18}>18 meses</option>
              <option value={24}>24 meses</option>
              <option value={36}>36 meses</option>
              <option value={48}>48 meses</option>
              <option value={60}>60 meses</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: 12 }}>Tasa anual (%)</label>
            <input
              type="number"
              value={rate}
              onChange={e => setRate(e.target.value)}
              min={0} max={200} step={0.5}
              style={{ height: 36 }}
            />
          </div>
        </div>

        {/* Results */}
        {result ? (
          <div style={{
            background: 'rgba(61,232,138,0.06)',
            border: '1px solid rgba(61,232,138,0.2)',
            borderRadius: 10,
            padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cuota mensual</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--success)' }}>
                {formatCurrency(result.monthlyPayment)}
              </span>
            </div>
            <div style={{ height: 1, background: 'rgba(61,232,138,0.15)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total a pagar</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                {formatCurrency(result.totalPayment)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total intereses</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: result.totalInterest > 0 ? 'var(--warning)' : 'var(--success)' }}>
                {formatCurrency(result.totalInterest)}
              </span>
            </div>
          </div>
        ) : (
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border)',
            borderRadius: 10, padding: '12px 16px',
            fontSize: 12, color: 'var(--text-muted)', textAlign: 'center',
          }}>
            Ingresá el precio para calcular el financiamiento
          </div>
        )}
      </div>
    </div>
  )
}
