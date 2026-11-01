---
title: "Migrating GitHub Actions to a new org with Renovate replacementName"
date: 2025-09-11
description: "Using Renovate packageRules to migrate action references across repos when a GitHub org changes."
tags: [til, github]
---

Use Renovate packageRules to migrate action references across repos when a GitHub org changes:

```json
{
  "packageRules": [
    {
      "matchDatasources": ["github-tags"],
      "matchPackageNames": ["old-org/github-workflows"],
      "replacementName": "new-org/github-workflows",
      "groupName": "Github Workflow Migration"
    }
  ]
}
```

This was super helpful when we migrated our shared workflows over to a new org and needed to update 100s of repos. We were then able to hand over the work for merging to the devs responsible for each repo.
