# Contributing

## Reporting Issues and Asking Questions

Before opening an issue, please search the [issue tracker](https://github.com/hps1978/react-native-web-tv/issues) to make sure your issue hasn't already been reported. Please note that your issue may be closed if it doesn't include the information requested in the issue template.

## Getting started

Visit the [Issue tracker](https://github.com/hps1978/react-native-web-tv/issues) to find a list of open issues that need attention.

Branch model used in this fork:

- `tv-main`: daily development branch.
- `master`: release branch.

Fork, then clone the repo:

```
git clone https://github.com/your-username/react-native-web-tv.git
```

Install dependencies (requires Node.js >= 16.0):

```
npm install
```

## Build

Build a specific package:

```
npm run build -w <package-name>
```

For example, this will build `react-native-web`:

```
npm run build -w react-native-web
```

Build all packages that can be built:

```
npm run build
```

## Develop

Develop a specific package:

```
npm run dev -w <package-name>
```

For example, this command will watch and rebuild the `react-native-web` package:

```
npm run dev -w react-native-web
```

And this command will watch and rebuild the `react-native-web-examples` package:

```
npm run dev -w react-native-web-examples
```

## Test

Run the monorepo linter:

```
npm run lint
```

Run the monorepo type checker:

```
npm run flow
```

Run the monorepo unit tests:

```
npm run unit
```

Run all the automated tests:

```
npm run test
```

## New Features

Please open an issue with a proposal for a new feature or refactoring before starting on the work. We don't want you to waste your efforts on a pull request that we won't want to accept.

## Pull requests

**Before submitting a pull request**, please make sure the following is done:

1. Fork the repository and create your branch from `tv-main`.
2. If you've added code that should be tested, add tests!
3. If you've changed APIs, update the documentation.
4. Ensure the tests pass (`npm run test`).

You should see a pre-commit hook run before each commit.

You can now submit a pull request, referencing any issues it addresses.

Please try to keep your pull request focused in scope and avoid including unrelated commits.

After you have submitted your pull request, it's recommended that **you** perform the first code review. We'll try to get back to you as soon as possible and may suggest changes.

Thank you for contributing!

## Releases

Release flow for this fork:

- Prepare and validate release candidates on `tv-main`.
- Merge or fast-forward the validated release state to `master`.
- Run the release command from a clean `master` working tree.
- The release script publishes `@hps1978/react-native-web-tv`.
- After publish, docs are deployed to `gh-pages` via `postrelease`.

Versioning convention for this fork:

- Keep the upstream RNW version as the base.
- Append the TV-specific release suffix as `-tv.<n>`.
- Example: `0.21.2-tv.1` means "first TV fork release built on upstream 0.21.2".
- Do not use underscore-based package versions such as `0.21.2_1`; npm publishing expects semver-compatible version strings.

To commit, publish, and push a final version from `master`:

```
npm run release -- <version> --otp=<otp-code>
```

Requirements:

- Run from `master` unless you are using `--skip-git`.
- Start from a clean working tree.

Release candidates or versions that you'd like to publish to npm, but do not want to produce a commit and push to GitHub:

```
npm run release -- <version> --skip-git
```
