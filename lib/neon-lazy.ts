/**
 * lib/neon-lazy.ts
 *
 * A drop-in replacement for `neon(process.env.DATABASE_URL!)` that does NOT
 * connect (or even read the env var) until a query is actually run.
 *
 * Why this exists: several API route files called `neon(process.env.DATABASE_URL!)`
 * at module scope (top-level `const sql = neon(...)`). Next.js imports every
 * route module during the "Collecting page data" build step to statically
 * analyze it — so on hosts where DATABASE_URL isn't available as a *build-time*
 * env var/secret (e.g. Cloudflare Pages/Workers, where secrets are typically
 * runtime-only), that top-level call threw immediately and crashed the whole
 * build with "No database connection string was provided to `neon()`".
 *
 * Using this lazy proxy instead means the module can be imported safely with
 * no DATABASE_URL present; the error (if the var is still missing) only
 * surfaces if a request actually tries to run a query, exactly like a normal
 * runtime configuration error should.
 */
import { neon } from '@neondatabase/serverless'

type NeonFn = ReturnType<typeof neon>

let _sql: NeonFn | null = null
function getSql(): NeonFn {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set')
    }
    _sql = neon(process.env.DATABASE_URL)
  }
  return _sql
}

/** Lazy tagged-template Neon client — safe to import at build time. */
export const lazySql: NeonFn = new Proxy(function () {} as any, {
  apply(_target, thisArg, args) {
    return Reflect.apply(getSql() as any, thisArg, args)
  },
  get(_target, prop) {
    return (getSql() as any)[prop]
  },
})
