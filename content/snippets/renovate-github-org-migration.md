+++
title = "Using Renovate to Migrate GitHub Action Org References"
date = 2025-08-24
+++

Discovered a neat use case for Renovate today: migrating GitHub Action workflow references when an organization changes names or when actions move between orgs.

## The Problem

When a GitHub organization renames or you need to migrate action references from one org to another, you have to update all workflow files across potentially hundreds of repositories.

## The Solution

Create a custom Renovate configuration with packageRules:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "packageRules": [
    {
      "description": "Replace `old-org` with `new-org` in GitHub Actions.",
      "matchDatasources": [
        "github-tags"
      ],
      "matchPackageNames": [
        "old-org/github-workflows"
      ],
      "replacementName": "new-org/github-workflows",
      "groupName": "Github Workflow Migration",
      "groupSlug": "github-workflow-migration"
    }
  ]
}
```

This will automatically create PRs to update all references from `old-org/github-workflows` to `new-org/github-workflows`.

## Key Benefits

- **Grouped PRs**: All migration changes are grouped together using `groupName` and `groupSlug`
- **Clear Description**: The description field helps document why this rule exists
- **Specific Targeting**: Using `matchDatasources` and `matchPackageNames` for precise matching
- **Schema Validation**: The `$schema` ensures your config is valid

Saved hours of manual work across dozens of repos!