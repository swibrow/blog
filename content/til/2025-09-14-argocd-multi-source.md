---
title: "ArgoCD multi source applications"
date: 2025-09-14
draft: false
---

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
