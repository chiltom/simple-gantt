# TODO List

## Documentation

1. Update README.md with new `dist/` directory updates and package features (Gemini can produce this).
2. Using dateUtils.ts as a guide, rearrange code to be more succinct and easily readable since JavaScript and TypeScript hoist methods (e.g., moving types and interfaces to very top of file, then exported methods, and ending with helper methods and the final `console.log()`)

## Interactivity

1. Check into relatedTarget logic and ensure that tooltip does not reappear whenever hovering back over SVG container.
2. Ensure that maximize/minimize functionality is fully implemented.
3. **CRITICAL**: Update date rendering logic to make Gantt chart viewable.

## Logging

1. Add a APP_ENV environment variable somewhere to facilitate logic for only logging checks in development. If APP_ENV is 'dev' or 'test', then the `console.log()` lines should execute, but if APP_ENV is 'prod' then they should not.
