import { memo, type CSSProperties } from 'react'
import type { GridCell } from '../types'
import { cellKey } from '../game/grid'

interface Props {
  grid: GridCell[][]
  cols: number
  rows: number
  suppressed: Set<string> // solved cells held empty during a fly animation
  justFilled: Set<string> // cells that should play the stamp pop
  hintCells: Set<string> // letter-hint reveals (gold edge), not yet part of a solved word
  registerCell: (key: string, el: HTMLDivElement | null) => void
}

function CrosswordImpl({ grid, cols, rows, suppressed, justFilled, hintCells, registerCell }: Props) {
  return (
    <div
      className="crossword-grid"
      style={
        {
          '--grid-cols': cols,
          '--grid-rows': rows,
          gridTemplateColumns: `repeat(${cols}, var(--cell))`,
        } as unknown as CSSProperties
      }
    >
      {grid.flatMap((row) =>
        row.map((cell) => {
          const key = cellKey(cell.row, cell.col)
          if (!cell.filled) {
            return <div key={key} className="cell cell--void" aria-hidden />
          }
          const shown = cell.revealed && !suppressed.has(key)
          const classes = ['cell']
          if (shown) classes.push('cell--filled')
          if (shown && justFilled.has(key)) classes.push('cell--just-filled')
          if (shown && hintCells.has(key)) classes.push('cell--hint')
          return (
            <div
              key={key}
              ref={(el) => registerCell(key, el)}
              className={classes.join(' ')}
              aria-label={shown ? cell.letter : 'empty'}
            >
              {shown ? cell.letter : ''}
            </div>
          )
        }),
      )}
    </div>
  )
}

export const Crossword = memo(CrosswordImpl)
