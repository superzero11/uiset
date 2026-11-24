import type { JSX } from "@solidjs/web"

type ClassOf<State> = JSX.ClassValue | ((state: State) => JSX.ClassValue)

/**
 * UISet's class for a part, beside the one given, which a part may take as a function of its
 * state. `given` is a getter, so a class prop that changes still reaches the part.
 */
const withClass =
  <State,>(base: string, given: () => ClassOf<State> | undefined) =>
  (state: State): JSX.ClassValue => {
    const own = given()
    return [base, typeof own === "function" ? own(state) : own]
  }

export { withClass }
export type { ClassOf }
