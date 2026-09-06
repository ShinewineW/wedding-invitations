'use client'

import { tie } from '../content'

/**
 * Chapter III, the turn, and the one place the page changes tone.
 *
 * Yue Lao works at night, so the paper inverts to ink and his moon comes up
 * behind the type. The thread becomes the brightest thing on the page and pulls
 * itself into a knot. Both the darkness and the cinch are driven by the same
 * scroll position, so the tonal change is not an effect laid over the chapter —
 * it is the chapter.
 */
export function TheTie() {
  return (
    <section className="chapter tie" id="tie" tabIndex={-1} data-chapter="tie" aria-labelledby="tie-title">
      <div className="hold">
        <div className="tie__inner">
          <p className="index">{tie.index}</p>

          <div className="tie__stack">
            <div className="tie__first" aria-hidden="true">
              <p className="tie__before">{tie.before}</p>
              <p className="tie__headline">{tie.headline}</p>
            </div>
            <h2 className="tie__merged" id="tie-title">
              {tie.merged}
            </h2>
          </div>

          <div className="tie__knot" data-tie-knot aria-hidden="true" />
          <p className="tie__after">{tie.after}</p>
        </div>
      </div>
    </section>
  )
}
