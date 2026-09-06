import { Stage } from './line/stage'
import { Overture } from './components/Overture'
import { TheThread } from './components/TheThread'
import { ThePull } from './components/ThePull'
import { TheTie } from './components/TheTie'
import { TheDay } from './components/TheDay'
import { TheRing } from './components/TheRing'
import { Colophon } from './components/Colophon'
import { ReadingNavigation } from './components/ReadingNavigation'

export default function App() {
  return (
    <Stage>
      <a className="skip" href="#day-title">
        跳至婚礼信息
      </a>
      <div className="moon" aria-hidden="true">
        <div className="moon__disc" />
      </div>
      <main className="page">
        <Overture />
        <TheThread />
        <ThePull />
        <TheTie />
        <TheDay />
        <TheRing />
      </main>
      <Colophon />
      <ReadingNavigation />
    </Stage>
  )
}
