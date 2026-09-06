import { ring } from '../content'

/** The ring belongs to this invitation and leaves the viewport with it. */
export function TheRing() {
  return (
    <section className="chapter ring" data-chapter="ring" aria-labelledby="ring-title">
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
