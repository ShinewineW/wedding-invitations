'use client'

import { ring } from '../content'

/** The completed circle and its words arrive together. */
export function TheRing() {
  return (
    <section className="chapter ring" id="ring" tabIndex={-1} data-chapter="ring" data-ring-state="closed" aria-labelledby="ring-title">
      <div className="ring__inner">
        <div className="ring__message" data-ring-center>
          <p className="index">{ring.index}</p>
          <h2 className="ring__lead" id="ring-title">{ring.lead}</h2>
        </div>
        <p className="ring__closing">{ring.closing}</p>
      </div>
    </section>
  )
}
