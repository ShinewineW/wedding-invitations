import { couple, occasion, overture } from '../content'
import './Overture.css'

/** Two names rest on visible red silk, inviting the reader into the story. */
export function Overture() {
  return (
    <section className="chapter overture" data-chapter="overture" aria-labelledby="names">
      <a className="jump overture__jump" href="#day-title">
        <span>{overture.jump}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2 2L10 10M3 10H10V3" stroke="currentColor" strokeWidth="1.1" />
        </svg>
      </a>

      <div className="overture__inner">
        <p className="meta">{overture.kicker}</p>

        <h1 className="names" id="names">
          <span className="names__row" data-rule="0">
            <span className="name">
              {couple.a.first}
            </span>
          </span>
          <span className="visually-hidden"> 与 </span>
          <span className="names__row names__row--b" data-rule="1">
            <span className="name">
              {couple.b.first}
            </span>
          </span>
        </h1>

        <div className="overture__meta">
          <p className="overture__date">
            <time dateTime={occasion.iso}>
              {occasion.dateLong}
            </time>
            <span className="overture__calendar">{occasion.weekday} · {occasion.lunar}</span>
          </p>

          <p className="overture__venue">
            <span>{occasion.venue}</span>
            <span className="overture__room">{occasion.room}</span>
          </p>

          <p className="hint">{overture.scrollHint}</p>
        </div>
      </div>
    </section>
  )
}
