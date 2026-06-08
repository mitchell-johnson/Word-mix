import { ECONOMY } from '../config'

interface Props {
  coins: number
  solved: number
  total: number
  onRevealLetter: () => void
  onRevealWord: () => void
  disabled: boolean
}

function CoinTag({ cost }: { cost: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      <span className="coin-disc" style={{ width: 15, height: 15, fontSize: 9 }}>
        ✦
      </span>
      <span className="tabnum">{cost}</span>
    </span>
  )
}

export function HintBar({ coins, solved, total, onRevealLetter, onRevealWord, disabled }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8 }}>
      <button
        className="hint-btn"
        onClick={onRevealLetter}
        disabled={disabled || coins < ECONOMY.hintRevealLetterCost || solved >= total}
        aria-label="Reveal a letter"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18h6" />
          <path d="M10 22h4" />
          <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z" />
        </svg>
        Hint
        <CoinTag cost={ECONOMY.hintRevealLetterCost} />
      </button>

      <div
        className="glass-pill tabnum"
        style={{ padding: '7px 14px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}
        aria-label={`${solved} of ${total} words found`}
      >
        {solved} / {total}
      </div>

      <button
        className="hint-btn"
        onClick={onRevealWord}
        disabled={disabled || coins < ECONOMY.hintRevealWordCost || solved >= total}
        aria-label="Reveal a whole word"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7V5a2 2 0 0 1 2-2h2" />
          <path d="M17 3h2a2 2 0 0 1 2 2v2" />
          <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
          <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
          <path d="M7 12h10" />
        </svg>
        Word
        <CoinTag cost={ECONOMY.hintRevealWordCost} />
      </button>
    </div>
  )
}
