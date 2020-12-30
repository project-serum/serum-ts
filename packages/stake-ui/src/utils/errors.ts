// Translates an error to a human readable string for UI display.
//
// TODO: handle this without parsing strings.
export function toDisplay(err: any): string {
  if (err.toString().includes('custom program error: 0x47')) {
    return 'A reward is available. Please claim your reward before using the pool.';
  }
  return err.toString();
}
