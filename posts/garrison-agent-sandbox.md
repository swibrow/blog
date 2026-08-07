---
title: "Sandboxing AI Agents for Garrison in Kubernetes"
date: 2026-07-31
description: "Why I stopped letting AI coding agents run against my home-ops cluster directly, and how kubernetes-sigs/agent-sandbox (SIG Apps) boxes them into pausable, disposable Kubernetes sandboxes instead"
author: "Samuel Wibrow"
tags: [kubernetes, ai, agents, security, claude, talos]
---

## The problem

Garrison is the thing I use to farm out coding tasks to AI agents - hand it an objective, it decomposes the work, spins up an agent per task, the agent writes code and opens a PR. Great for velocity, mildly terrifying if you think about it for more than ten seconds.

The naive setup is: agent runs somewhere with a checkout of the repo, a `kubectl` context, and whatever credentials it needs to actually get useful work done. That's also the setup where a bad prompt, a hallucinated command, or a genuinely malicious dependency in a task's toolchain gets to do `kubectl delete` against my home-ops cluster, or exfiltrate whatever secrets happen to be sitting in its environment. An agent that can edit files is fine. An agent that can edit files *and* reach the Kubernetes API server *and* has the same network access as the node it's running on is a different risk category entirely.

The threat model isn't "the model is evil" - it's that agents execute arbitrary shell commands as part of normal operation, and I don't fully control what ends up in a task's context or dependency chain. I wanted the blast radius of a compromised or confused agent to be "this one throwaway pod," not "my cluster."

## The approach: don't reinvent it, adopt it

The instinct is to hand-roll this: a Job manifest, a NetworkPolicy, a scoped ServiceAccount, wired up by hand. I started down that road and stopped, because a plain `batch/v1` Job is the wrong shape for what a Garrison "raid" actually needs. A raid isn't run-to-completion - it can **hibernate** mid-task (waiting on a spec approval or human review) and **resume** later without losing its git clone or `.garrison/` state. Jobs don't pause. Deployments don't have a stable identity or a per-instance disk. What I actually wanted was something closer to a single-pod StatefulSet with a lifecycle API.

That's exactly what [`kubernetes-sigs/agent-sandbox`](https://github.com/kubernetes-sigs/agent-sandbox) is: a `Sandbox` CRD and controller developed under the umbrella of [SIG Apps](https://github.com/kubernetes/community/tree/master/sig-apps), purpose-built for "isolated, stateful, singleton workloads, ideal for use cases like AI agent runtimes" - their words, not mine, and it's exactly the shape of the problem. Rather than write my own version of pod lifecycle management, RBAC scoping, and pause/resume semantics, I run their controller and let Garrison's control plane (`keep`) drive it through the Kubernetes API.

The core `Sandbox` CRD gives you a pod with a stable identity and persistent storage, plus a controller that manages create/pause/resume/delete. An `extensions` module built on top adds `SandboxTemplate` (reusable pod specs), `SandboxClaim` (grab a Sandbox from a pool without knowing its details), and `SandboxWarmPool` (keep some pre-warmed and idle). Garrison uses the core CRD directly with its own orchestration logic on top; a separate project on the same cluster, `flickerd`, uses the extensions CRDs declaratively instead - same controller, two different ways of driving it, which is a decent sign the abstraction is actually reusable.

## Implementation

The controller itself is vendored into home-ops, not installed via Helm - the upstream project ships two manifests (core + extensions) and I track them explicitly rather than trusting an upstream chart to reconcile RBAC correctly on every bump:

```yaml
# kubernetes/apps/pitower/ai/agent-sandbox/kustomization.yaml
# Vendored from github.com/kubernetes-sigs/agent-sandbox release v0.5.0:
#   manifest.yaml   -> controller.yaml   (core CRD, RBAC, ns, service)
#   extensions.yaml -> extensions.yaml   (3 extension CRDs, RBAC, controller Deployment)
#   controller image: registry.k8s.io/agent-sandbox/agent-sandbox-controller:v0.5.0
resources:
  - controller.yaml
  - extensions.yaml
```

Garrison's own launcher (`packages/keep/src/launcher/sandbox.ts`) creates one `Sandbox` CR per raid, named `garrison-<raid-id>`:

```yaml
apiVersion: agents.x-k8s.io/v1alpha1
kind: Sandbox
metadata:
  name: garrison-a1b2c3
  labels:
    garrison.dev/raid-id: a1b2c3
spec:
  replicas: 1
  podTemplate:
    spec:
      automountServiceAccountToken: false
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
        seccompProfile: { type: RuntimeDefault }
      containers:
        - name: sortie
          image: garrison-runner:latest
          args: ["garrison", "sortie", "--attend"]
          securityContext:
            allowPrivilegeEscalation: false
            capabilities: { drop: ["ALL"] }
          volumeMounts:
            - { name: workspace, mountPath: /workspace }
  volumeClaimTemplates:
    - metadata:
        name: workspace
        labels: { garrison.dev/raid-id: a1b2c3 }
      spec:
        accessModes: ["ReadWriteOnce"]
        resources: { requests: { storage: 5Gi } }
```

The `volumeClaimTemplates` are the whole point: like a StatefulSet's PVCs, that workspace disk outlives the pod. `hibernate()` and `resume()` are just a `patchSpec` flipping `spec.replicas` between `0` and `1` - the git clone and `.garrison/` state sit untouched on the PVC while the pod is gone. `shutdown()` patches `replicas: 0` plus `spec.shutdownTime` set to now + an audit window (24h by default), so the controller - not the raid itself - deletes the CR once that window passes, leaving the evidence around long enough to actually look at it. Deleting the PVC is a separate, explicit `reclaim()` call made only once a raid is genuinely done (shipped and merged, or its failure record cleared), the same way a StatefulSet's `volumeClaimTemplates` aren't garbage-collected with the workload.

RBAC for `garrison-keep` is a single namespaced `Role`, not a `ClusterRole` - it can only touch `Sandbox` CRs, pods, and PVCs inside the runner namespace:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: garrison-keep-sandboxes
  namespace: garrison-runs
rules:
  - apiGroups: ["agents.x-k8s.io"]
    resources: ["sandboxes"]
    verbs: ["create", "get", "list", "watch", "patch", "delete"]
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["persistentvolumeclaims"]
    verbs: ["list", "delete"]
```

And the actual `NetworkPolicy` the runner pods live under: DNS, the keep's own port, full internet egress except the private ranges the cluster and its neighbours live on, with a hook for narrow operator-declared exceptions (e.g. the in-cluster MCP catalog):

```yaml
# deploy/charts/garrison/templates/runs-networkpolicy.yaml
spec:
  podSelector:
    matchLabels: { app.kubernetes.io/name: garrison-runner }
  policyTypes: ["Egress"]
  egress:
    - to: [{ namespaceSelector: {}, podSelector: { matchLabels: { k8s-app: kube-dns } } }]
      ports: [{ protocol: UDP, port: 53 }, { protocol: TCP, port: 53 }]
    - to: [{ namespaceSelector: { matchLabels: { kubernetes.io/metadata.name: garrison } },
             podSelector: { matchLabels: { app.kubernetes.io/name: garrison-keep } } }]
      ports: [{ protocol: TCP, port: 8787 }]
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
            except: ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]
```

A couple more things worth calling out:

- **Git credentials aren't a static secret sitting in every pod.** Garrison mints a repo-scoped token per raid through a GitHub App and injects it as `GH_TOKEN`, re-minted (`forceRefresh: true`) on retry or resume instead of reused stale.
- **Warm starts.** Cold-launching a Sandbox means scheduling, an image pull, and PVC provisioning before an agent does anything - so Garrison keeps a small pool of idle `Sandbox` CRs pre-created (`SandboxWarmPool` in Garrison's own code, distinct from the upstream extension CRD of the same name) and claims one at launch time, falling back to create-on-demand when the pool's empty.
- **Logs outlive the pod.** Kubernetes throws away a pod's logs the moment the pod is gone, which is exactly when a hibernated, wiped, or reclaimed raid needs them most for a post-mortem. An optional VictoriaLogs-backed archive, queried by the raid's derived pod name and the `sortie` container, backfills that for `inspect`/`analyse`/`rez` after the live pod is history.

## Outcome

The main thing this bought me is not having to build or trust my own pod-lifecycle machinery - the sandbox/pause/resume/delete state machine, the CRD, the controller's reconcile loop are all upstream and maintained. What Garrison owns on top is much smaller and much more specific to it: raid IDs, hibernate/resume semantics mapped onto `replicas`, warm pools, scoped GitHub tokens. That's a much smaller surface to get wrong.

It wasn't friction-free, though, and the friction was informative:

- **A silent 7-day outage.** Bumping the vendored manifests from v0.4.6 to v0.5.0 dropped a CRD-patch permission from the controller's `ClusterRole`. Nothing crash-loops when a controller can accept writes but can't reconcile them - it just quietly stops working, which is how it went unnoticed for a week.
- **`create()`/`patchSpec()` succeeding proves nothing about the pod.** The apiserver accepting a write and the controller successfully reconciling it into a running pod are two different events, and a bad spec only fails at the second one - invisibly, from the caller's side. Garrison's `health()` now polls the CR's `Ready` condition for a terminal `ReconcilerError` so a raid whose pod can never start doesn't sit reported as "running" forever.
- **JSON Merge Patch bites you on partial container updates.** `Sandbox` spec patches replace `containers[]` wholesale rather than merging field-by-field. An early patch that only sent `{name, env}` silently wiped `image` from the CR's stored spec, and every subsequent reconcile then failed with `image: Required value`. Every call site that patches a container now sends the full container shape, every time.
- **A reused raid ID could hijack another raid's disk.** A `409 AlreadyExists` on create (which legitimately happens when a prior write landed but the response was lost) was originally treated as always-success. It now verifies the existing CR actually carries *this* raid's ID label before treating the conflict as "already applied" - otherwise a raid could silently attach to a stranger's PVC.
- **Hardcoded resource limits were self-inflicted throttling.** The sortie container capped agent work at 2 CPU / 4Gi; dropped the limits, kept only the scheduling requests.

None of that is exotic - it's the normal cost of running someone else's controller against a shared apiserver. But it's a much shorter list than the one I'd have written debugging my own hand-rolled Job-and-NetworkPolicy scheme, and every fix here landed as a change to a few hundred lines of TypeScript instead of a redesign.
