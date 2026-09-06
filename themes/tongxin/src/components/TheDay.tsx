import { day, occasion, photos } from '../content'
import { useStage } from '../line/stageApi'
import './TheDay.css'

/**
 * Chapter IV. The cord is now a single taut rail, and the rail parks itself on
 * whichever entry the reader is at. A mouse can take the rail somewhere else by
 * hovering; without one, the reader's scroll position decides, so nothing is
 * only reachable by pointer.
 */
export function TheDay() {
  const stage = useStage()
  const hoverable = !stage.coarse

  return (
    <section className="chapter day" data-chapter="day" aria-labelledby="day-title">
      <header className="day__head">
        <p className="index">{day.index}</p>
        <h2 className="lead" id="day-title">
          {day.lead}
        </h2>
        <p className="day__date">
          <time dateTime={occasion.iso}>
            <span className="day__year">{occasion.year}</span>
            <span className="day__monthday">{occasion.month} {occasion.day}</span>
          </time>
          <span className="day__calendar">{occasion.weekday} · {occasion.lunar}</span>
        </p>
      </header>

      <ol className="schedule">
        {day.schedule.map((item, i) => (
          <li
            className="row"
            data-rail-row
            key={item.time}
            onMouseEnter={hoverable ? () => stage.setRailOverride(i) : undefined}
            onMouseLeave={hoverable ? () => stage.setRailOverride(null) : undefined}
          >
            <time className="row__time" dateTime={`${occasion.iso}T${item.time}`}>{item.time}</time>
            <span>
              <span className="row__name">{item.name}</span>
              <span className="row__where">{item.where}</span>
              <span className="row__note">{item.note}</span>
            </span>
          </li>
        ))}
      </ol>

      <figure className="plate">
        <div className="plate__frame">
          <img
            src={photos.day.src}
            width={1920}
            height={1281}
            alt={photos.day.alt}
            loading="lazy"
            decoding="async"
          />
        </div>
        <figcaption className="caption">{day.photoCaption}</figcaption>
      </figure>

      <dl className="facts">
        <div className="fact">
          <dt>{day.labels.where}</dt>
          <dd>
            {day.venue.name}
            <br />
            {day.venue.address.map((l) => (
              <span key={l}>
                {l}
                <br />
              </span>
            ))}
          </dd>
        </div>
        <div className="fact">
          <dt>{day.labels.wear}</dt>
          <dd>{day.dress}</dd>
        </div>
      </dl>
    </section>
  )
}
