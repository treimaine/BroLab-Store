# Archived Migrations

**⚠️ IMPORTANT: These migrations are archived and not meant to be executed.**

These files have been moved to the archive directory because they are one-time data migrations that have already been applied to the production database. They are preserved for:

1. **Historical Reference** - Understanding past data issues and fixes
2. **Documentation** - Explaining why certain data structures exist
3. **Emergency Rollback** - Potential data recovery scenarios (use with extreme caution)

## TypeScript Errors

The files in this directory will show TypeScript errors because the import paths (`../_generated/server`) are no longer valid from this location. This is intentional - these files should not be executed from here.

## If You Need to Run a Migration

If you absolutely need to run one of these migrations:

1. **DO NOT** run it directly from the archive
2. Copy the file to `convex/migrations/` (parent directory)
3. Update the import paths to `../_generated/server`
4. Test thoroughly in development first
5. Run with `dryRun: true` to preview changes
6. Monitor the Convex dashboard during execution
7. Move it back to archive after completion

## Migration History

See `docs/CONVEX_MIGRATIONS_ARCHIVE.md` for detailed documentation about each migration, including:

- Purpose and what it fixes
- When it was applied
- Impact on data
- Rollback considerations

## Questions?

If you have questions about these migrations or need to understand historical data issues, refer to:

- `docs/CONVEX_MIGRATIONS_ARCHIVE.md` - Detailed migration documentation
- Git history - Original commit messages and context
- Convex dashboard - Data structure and current state

---

_Last Updated: 2025-01-08_
_Archived as part of Codebase Cleanup Task 10.3_
