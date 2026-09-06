/**
 * The contract between the stage and the chapters that sit on top of it.
 *
 * Kept apart from the component so that editing a chapter does not reload the
 * simulation, and so the surface a chapter is allowed to touch is written down
 * in one short file.
 */

import { createContext, useContext } from 'react'
import type { ChapterId } from './shapes'

export interface StageApi {
  chapter: ChapterId
  /** true once the visitor has uncovered the thread for the first time */
  found: boolean
  /** the visitor asked for as little movement as possible */
  reduced: boolean
  /** a finger rather than a cursor */
  coarse: boolean
  /** hold the schedule rail on one entry, or null to follow the reader */
  setRailOverride: (index: number | null) => void
}

const noop = () => {}

export const StageCtx = createContext<StageApi>({
  chapter: 'overture',
  found: false,
  reduced: false,
  coarse: false,
  setRailOverride: noop,
})

export const useStage = () => useContext(StageCtx)
