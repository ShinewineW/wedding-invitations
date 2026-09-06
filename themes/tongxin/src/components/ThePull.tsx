import { photos, pull } from '../content'

/** The original notes ride the silk above the chapter's reading copy. */
export function ThePull() {
  return (
    <section className="chapter pull" data-chapter="pull" aria-labelledby="pull-title">
      <div className="hold">
        <div className="pull__inner">
          <div className="pull__photo" data-pull-photo role="img" aria-label={photos.pull.alt}>
            <div className="pull__handle" data-pull-handle aria-hidden="true" />
            {pull.notes.map((note) => (
              <span className="pull__note" data-pull-note data-u={note.u} data-strand={note.strand}
                aria-hidden="true" key={note.text}>{note.text}</span>
            ))}
          </div>
          <div className="pull__copy">
            <p className="index">{pull.index}</p>
            <h2 className="lead" id="pull-title">{pull.lead}</h2>
            <p className="body">{pull.body}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
