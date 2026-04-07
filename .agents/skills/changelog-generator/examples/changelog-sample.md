## [2.1.0] - 2026-03-29

### Breaking Changes

- **API response format changed for `/api/users` endpoint** — The `users` array now returns objects with `fullName` instead of separate `firstName`/`lastName` fields. Update your client code to use `user.fullName` instead of `${user.firstName} ${user.lastName}`.

### Added

- Added dark mode support for the dashboard (#142)
- New export-to-PDF feature for reports (#156)

### Fixed

- Fixed login timeout on slow connections (#148)
- Resolved race condition in concurrent file uploads (#151)

### Changed

- Dependencies updated (3 packages)

### Contributors

@alice-chen, @bob-smith, @carol-davis
