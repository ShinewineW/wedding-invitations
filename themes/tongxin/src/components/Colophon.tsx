import { colophon, day, occasion } from '../content'

export function Colophon() {
  return (
    <footer className="colophon" aria-label="婚礼赴约信息">
      <p className="colophon__date"><time dateTime={occasion.iso}>{occasion.dateLong}</time></p>
      <p className="colophon__calendar">{occasion.weekday} · {occasion.lunar}</p>
      <div className="colophon__schedule">
        {day.schedule.map(item => (
          <p key={item.time}>
            <time dateTime={`${occasion.iso}T${item.time}`}>{item.time}</time>
            <span>{item.name}</span>
          </p>
        ))}
      </div>
      <p className="colophon__venue">{occasion.venue}<br />{occasion.room}</p>
      <p className="colophon__signature">{colophon.signature}</p>
    </footer>
  )
}
