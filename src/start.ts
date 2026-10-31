import { createCsrfMiddleware, createStart } from '@tanstack/react-start'

/**
 * Request middleware is a server-only boundary. The CSRF guard applies to the
 * server-function RPC endpoints only; page requests and the public API routes
 * keep their normal semantics.
 */
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
})

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware],
}))
