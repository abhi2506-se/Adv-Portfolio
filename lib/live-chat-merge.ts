/**
 * Live Chat — client-side message merge helper.
 *
 * Both the user and admin chat panels keep an optimistic "pending" bubble
 * (keyed by a locally-generated `client_id`) while a message is in flight,
 * then swap it out for the confirmed row the server returns (keyed by its
 * real `id`). That swap only happened in the direct send handler's own
 * `.then()` — but messages also arrive independently via the 4s poll and
 * via Supabase Realtime broadcasts. If either of those delivered the
 * confirmed row (a different key) before the original request's own
 * handler had a chance to delete the pending one, BOTH ended up in the map
 * at once and rendered as two bubbles for the same message ("message shows
 * sent again"). This helper closes that gap: whenever a message with a
 * `client_id` comes in from ANY source, it first evicts any other entry
 * that shares that `client_id` before inserting the new one.
 */
export function mergeIncomingMessage<T extends { id: string; client_id?: string | null }>(
  map: Map<string, T>,
  incoming: T,
): void {
  if (incoming.client_id) {
    for (const [key, existing] of map) {
      if (key !== incoming.id && existing.client_id === incoming.client_id) {
        map.delete(key)
      }
    }
  }
  map.set(incoming.id, incoming)
}

/** Same as above, but for a whole batch (e.g. a poll response's message list). */
export function mergeIncomingMessages<T extends { id: string; client_id?: string | null }>(
  map: Map<string, T>,
  incoming: T[],
): void {
  for (const m of incoming) mergeIncomingMessage(map, m)
}
