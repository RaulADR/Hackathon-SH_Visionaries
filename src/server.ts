import {
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server'
import { createServerEntry } from '@tanstack/react-start/server-entry'

/**
 * Explicit streaming SSR entry point. `defaultStreamHandler` renders the full
 * document and keeps the response open for deferred loader data and Suspense
 * boundaries.
 */
const startHandler = createStartHandler(defaultStreamHandler)

export default createServerEntry({
  fetch(request, opts) {
    return startHandler(request, opts)
  },
})
