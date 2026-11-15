/** Pure intent for tapping a department. A worker's sprite uses the same intent.
 * Avoids invalid placement onto an occupied department; actual placement and
 * Energy rules remain in the existing crew/v3 reducers.
 */
export function roomTapAction(room, pickedCrewId, occupantId = null) {
  if (pickedCrewId && (!occupantId || occupantId === pickedCrewId)) {
    return { type: 'PLACE_CREW', room };
  }
  return { type: 'FOCUS_ROOM', room };
}
