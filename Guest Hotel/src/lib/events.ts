/** Tiny in-page event bus so a room card's "Book Now" can prefill the
 *  reservation form before scrolling to it. Keeps the single-page flow. */
export const ROOM_SELECT_EVENT = 'komorebi:select-room';

export function selectRoom(roomId: string): void {
  window.dispatchEvent(new CustomEvent<string>(ROOM_SELECT_EVENT, { detail: roomId }));
}
