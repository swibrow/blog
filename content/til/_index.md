---
title: "Today I Learned (til)"
description : "A collection of my daily learnings. Some useful, some not so much."
---

I collect a lot of little snippets and notes that I store in my Obsidian vault for remembering nice tools or helpful actions across my day to day work.

---

## Kubernetes Deployment that OOMKilled

This deployment will eventually get OOMKilled as it tries to allocate more memory than the limit set.

```
apiVersion: apps/v1
kind: Deployment
metadata:
  name: oomkill-test-deployment
  labels:
    app: oomkill-test
spec:
  replicas: 1
  selector:
    matchLabels:
      app: oomkill-test
  template:
    metadata:
      labels:
        app: oomkill-test
    spec:
      containers:
      - name: memory-eater
        image: python:3-alpine
        command: ["/bin/sh"]
        args:
          - "-c"
          - |
            python3 -c "
            import time
            import sys

            print('Starting memory allocation test...', flush=True)
            memory_list = []
            chunk_size = 10 * 1024 * 1024  # 10MB

            while True:
                try:
                    # Allocate 10MB of memory
                    memory_chunk = bytearray(chunk_size)
                    memory_list.append(memory_chunk)

                    total_mb = (len(memory_list) * chunk_size) / (1024 * 1024)
                    print(f'Allocated {total_mb:.1f} MB', flush=True)

                    time.sleep(2)
                except MemoryError:
                    print('Memory allocation failed!', flush=True)
                    break
            "
        resources:
          requests:
            memory: "64Mi"
            cpu: "10m"
          limits:
            memory: "128Mi"
            cpu: "100m"
```

---

## fzf and all its glory

I've been using `fzf` for a while now, and it has completely transformed my command line experience. The ability to fuzzy-find files, commands, and even git branches is a game changer. If you haven't tried it yet, I highly recommend giving it a go!

![fzf.gif](./images/fzf.gif)

In this demo, I'm using fzf to find git project directory and then creating a new tmux window.

`ctrl + a + f`

ctrl + a is my tmux prefix

tmux config

`bind-key -r f display-popup -E "zsh $HOME/.local/scripts/tmux-project.sh"`

```shell
───────┬──────────────────────────────────────────────────────────────────
       │ File: .local/scripts/tmux-project.sh
───────┼──────────────────────────────────────────────────────────────────
   1   │ #!/usr/bin/env zsh
   2   │
   3   │ selected_dir=$(cd ~/dev; fd -t d -d 2 . --color=always | fzf --an
       │ si --highlight-line -e)
   4   │ if [[ -n "$selected_dir" ]]; then
   5   │     dir_basename=$(basename "$selected_dir")
   6   │     tmux new-window -a -n "${dir_basename:0:6}" -c "$HOME/dev/$se
       │ lected_dir" -k
   7   │ else
   8   │     echo "No directory selected"
   9   │ fi
───────┴──────────────────────────────────────────────────────────────────
```

---

## ArgoCD multi source applications

I was creating some basic app deployments in ArgoCD and was using a multi source app to pass in values to a Helm chart. Little did I know, that any Kubernetes resource in the path of the ref source will actually also be included in the rendered template.

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/datreeio/CRDs-catalog/refs/heads/main/argoproj.io/applicationset_v1alpha1.json
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: external-dns
  namespace: argocd
  labels:
    team: platform
spec:
  ...
  template:
    ...
    spec:
      project: cluster-tools
      sources:
      - repoURL: https://kubernetes-sigs.github.io/external-dns/
        chart: external-dns
        targetRevision: 1.18.0
        helm:
          releaseName: external-dns
          namespace: external-dns
          valueFiles:
          - $values/values.yaml
      - repoURL: https://github.com/foo/bar.git
        targetRevision: HEAD
        path: baz/bar/foo # Any Kubernetes resources in this directory will also be rendered even though ref is defined.
        ref: values
```

Being able to essentially put any supporting resource in the `baz/bar/foo` directory makes things easier if the chart does not support the common pattern of extraObjects / extraManifests.

---

## Renovate GitHub Action Migration

Use Renovate packageRules to migrate action references across repos when Github org needs to be changed:

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

This was super helpful when we migrated our shared workflows over to a new org and needed to update 100s of repos. We then we able to handover the work for merging to the devs responsible for each repo.

---

## Terminal Spotify Client

[ncspot](https://github.com/hrkfdn/ncspot) is a cross-platform Spotify client for the terminal written in Rust. Lightweight alternative to the bloated Spotify desktop app.

![ncspot](./images/ncspot.png)

---

## Removing Resources from Terraform State

Its the simple stuff I always forget. Remove resource from state but don't destroy it.

```hcl
removed {
  from = aws_instance.example

  lifecycle {
    destroy = false
  }
}
```

The actual resource block (`aws_instance.example`) must also be removed from your configuration files.
