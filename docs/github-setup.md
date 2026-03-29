# GitHub Setup

## Branch Protection

Recommended branch protection for `main`:

- require pull request before merge
- require status checks before merge
- require the `Windows Desktop Validation` check
- block force pushes
- block branch deletion

## Actions Permissions

Repository settings should allow GitHub Actions to:

- read repository contents
- write release contents

## Release Publishing Consistency

Before depending on auto-publish:

- make sure `git remote -v` points to the same repository configured in `package.json > build.publish`
- make sure tags are pushed to that same repository
- confirm releases are created under the same owner/repo that `electron-updater` expects

## Optional Secrets

If you later enable signing:

- `CSC_LINK`
- `CSC_KEY_PASSWORD`
