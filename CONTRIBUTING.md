# Contributing

Thanks for helping keep legacy Bootstrap 3 sites secure. This project has a small
surface area and a strict workflow so that every release is reviewed and tested.

## Ground rules

1. **Direct pushes to `main` are forbidden.** `main` is protected; every change lands
   through a Pull Request.
2. **Work on a prefixed branch** (see below), created from an up-to-date `main`.
3. **PRs must pass CI before merging.** The `Test` jobs and the `Branch naming` check
   are required status checks.
4. **No runtime dependencies.** The library must stay dependency-free. Dev
   dependencies (test/build tooling) are fine.
5. **Match Bootstrap 3 behaviour.** When in doubt, mirror what Bootstrap 3.4.1's
   plugin does (class names, event names and order, `data-*` options) and add a test.

## Branch naming

| Prefix      | Use for                                              | Example                          |
| ----------- | ---------------------------------------------------- | -------------------------------- |
| `feature/`  | New features or capabilities                         | `feature/modal-animations`       |
| `fix/`      | Bug fixes                                            | `fix/dropdown-event-bubbling`    |
| `chore/`    | Build scripts, dependency updates, CI config changes | `chore/update-vitest`            |

Names after the prefix are lowercase kebab-case (`[a-z0-9._-]`). CI rejects PRs from
branches that don't follow this pattern.

## Workflow

```bash
git checkout main && git pull
git checkout -b fix/dropdown-event-bubbling

npm ci
npm test            # run the suite once
npm run test:watch  # TDD loop
npm run coverage    # enforce coverage thresholds (same as CI)
npm run build       # produce dist/

git push -u origin fix/dropdown-event-bubbling
# open a Pull Request against main
```

### Pull Request checklist

- [ ] Branch follows the naming convention
- [ ] Tests added or updated for the change (bug fixes include a regression test)
- [ ] `npm run coverage` passes locally
- [ ] README updated if public behaviour or API changed

## Releasing (maintainers)

1. On a `chore/release-x.y.z` branch, bump `version` in `package.json`
   (`npm version x.y.z --no-git-tag-version`) and merge it via PR.
2. Create a GitHub Release from `main` with tag `vx.y.z`. Mark it as a pre-release
   to publish under the `next` dist-tag.
3. The `CI & Publish` workflow runs tests, checks that the tag matches
   `package.json`, builds, and publishes to npm with provenance.

## Repository setup (one-time, maintainers)

The rules above are enforced by GitHub settings, not just by convention:

- **Branch protection / ruleset on `main`:** require a pull request before merging,
  require status checks `Test (Node 22)`, `Test (Node 24)` and `Branch naming` to
  pass, require branches to be up to date, and block force pushes and deletions.
  Enable "Do not allow bypassing the above settings".
- **Secrets:** add an npm automation token as `NPM_TOKEN` to the `npm` environment
  (Settings → Environments). Alternatively, configure npm
  [trusted publishing](https://docs.npmjs.com/trusted-publishers) for this
  workflow and drop the token.
