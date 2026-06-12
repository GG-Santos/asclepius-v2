// Client-safe helpers for policy-aware expiry copy. Components never
// hardcode duration literals — the configured years arrive as props.

/** "1 year" / "3 years" */
export function yearsLabel(n: number): string {
  return n === 1 ? "1 year" : `${n} years`;
}

/** "one year" / "3 years" — for prose copy. */
export function yearsNoun(n: number): string {
  return n === 1 ? "one year" : `${n} years`;
}
