# Changelog

## [0.1.0-beta.0] - 2026-05-18

### Fixed
- Non-null assertion `entry.values!` replaced with optional chaining (`entry.values?.includes()`) — crash fix
- `validateDefault()` now validates `url`, `host`, `enum` types
- Switch `default` case throws `BunEnvError` on unknown type
- `raw.trim()` now handles non-string `Bun.env` values safely
- Hex/octal/binary number input now rejected in number coercion
- Tests no longer mutate `Bun.env` globally (added `beforeEach`/`afterEach` cleanup)

## [0.1.0-alpha.0] - 2026-05-15

### Added
- Initial release
- `env()` function with declarative schema validation
- Type coercion: string, number, boolean, port, url, host, enum
- Required field validation with actionable error messages
- Default values for optional variables
- Error aggregation (all errors reported at once)
- Zero dependencies
