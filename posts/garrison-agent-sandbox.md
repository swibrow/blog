---
title: "Sandboxing AI Agents for Garrison in Kubernetes"
date: 2026-07-31
description: "Why I stopped letting AI coding agents run against my home-ops cluster directly, and how I boxed them into ephemeral, locked-down Kubernetes Jobs instead"
author: "Samuel Wibrow"
tags: [kubernetes, ai, agents, security, claude, talos]
---

## The problem

Garrison is the thing I use to farm out coding tasks to AI agents — hand it a task, it spins up an agent, the agent writes code, opens a PR, done. Great for velocity, mildly terrifying if you think about it for more than ten seconds.

The naive setup is: agent runs somewhere with a checkout of the repo, a `kubectl` context, and whatever credentials it needs to actually get useful work done. That's also the setup where a bad prompt, a hallucinated command, or a genuinely malicious dependency in a task's toolchain gets to do `kubectl delete` against my home-ops cluster, or exfiltrate whatever secrets happen to be sitting in its environment. An agent that can edit files is fine. An agent that can edit files *and* reach the Kubernetes API server *and* has the same network access as the node it's running on is a different risk category entirely.

The threat model isn't "the model is evil" — it's that agents execute arbitrary shell commands as part of normal operation, and I don't fully control what ends up in a task's context or dependency chain. I wanted the blast radius of a compromised or confused agent to be "this one throwaway pod," not "my cluster."

## The approach

The fix is the same one you'd reach for with any untrusted workload: don't give it host or cluster access, give it a sandbox, and throw the sandbox away when it's done.

Concretely, each Garrison task runs as its own Kubernetes Job, in its own namespace, with:

- **One pod per task.** No long-lived agent process with accumulated state — a Job is created, it runs, it exits, it's garbage collected.
- **A dedicated, minimal ServiceAccount.** The agent's pod gets a ServiceAccount with no RBAC bindings beyond what it needs to report its own status. It cannot list pods, read secrets, or touch any other resource in the cluster — including its own namespace, beyond itself.
- **A default-deny NetworkPolicy**, with narrow egress carve-outs for exactly what a task needs (the git remote, the LLM API endpoint, a package registry mirror). No access to internal cluster services, no access to the Talos API, no lateral movement.
- **Resource limits and a namespace-level ResourceQuota**, so a runaway agent loop can't starve the node or take down neighboring workloads.
- **No persistent volumes back to the host.** The pod's filesystem is its own ephemeral scratch space; nothing it writes survives past the Job unless it's explicitly shipped out through a controlled path (more on that below).

This fits the rest of the home-ops stack: everything is declared as YAML, reconciled through GitOps, running on Talos nodes that don't even have SSH. Garrison's sandbox is just another workload that happens to be short-lived and adversarially-minded by design, rather than a bolted-on side process with its own rules.

## Implementation

A task starts life as a Job manifest, templated per-task with the repo, branch, and task spec baked in as environment variables rather than mounted credentials:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: garrison-task-a1b2c3
  namespace: garrison-sandbox
  labels:
    garrison.wibrow.dev/task-id: a1b2c3
spec:
  backoffLimit: 0
  activeDeadlineSeconds: 1800
  ttlSecondsAfterFinished: 600
  template:
    spec:
      serviceAccountName: garrison-agent
      automountServiceAccountToken: false
      restartPolicy: Never
      containers:
        - name: agent
          image: registry.internal/garrison-agent:latest
          env:
            - name: GARRISON_TASK_ID
              value: "a1b2c3"
            - name: GARRISON_REPO
              value: "swibrow/blog"
          envFrom:
            - secretRef:
                name: garrison-task-a1b2c3-creds
          resources:
            requests:
              cpu: "500m"
              memory: "512Mi"
            limits:
              cpu: "2"
              memory: "2Gi"
          securityContext:
            runAsNonRoot: true
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: ["ALL"]
          volumeMounts:
            - name: workspace
              mountPath: /workspace
      volumes:
        - name: workspace
          emptyDir:
            sizeLimit: 4Gi
```

A couple of things worth calling out:

- `automountServiceAccountToken: false` — the agent doesn't need to talk to the Kubernetes API at all, so it doesn't get a token to do it with.
- `readOnlyRootFilesystem: true` plus a scoped `emptyDir` for `/workspace` — the container image itself can't be modified at runtime, and the only writable space is the ephemeral checkout.
- The task's Git credentials and LLM API key are injected as a per-task Secret (`garrison-task-a1b2c3-creds`), scoped to exactly this Job and deleted alongside it, rather than a shared, long-lived credential mounted everywhere.

The NetworkPolicy is what actually keeps the pod from becoming a pivot point:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: garrison-agent-egress
  namespace: garrison-sandbox
spec:
  podSelector:
    matchLabels:
      garrison.wibrow.dev/role: agent
  policyTypes:
    - Ingress
    - Egress
  ingress: []
  egress:
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
            except:
              - 10.0.0.0/8
              - 172.16.0.0/12
              - 192.168.0.0/16
      ports:
        - protocol: TCP
          port: 443
```

No ingress at all, DNS resolution, and outbound HTTPS to the public internet only — explicitly excluding the private ranges the cluster and its neighbors live in. The agent can reach GitHub and the LLM API; it cannot reach the Talos API server, kromgo, or anything else running in the cluster, because those are all on private addresses.

Results come back out through a narrow, deliberate path rather than the pod having any lasting presence: the agent pushes its branch and opens (or updates) a pull request using a scoped, task-specific token, and writes a short status/result payload to a location Garrison's controller polls. Once the Job finishes — success, failure, or timeout via `activeDeadlineSeconds` — `ttlSecondsAfterFinished` cleans it up automatically. Nothing about the task persists in the cluster after that except the PR itself and whatever logs got shipped to the log pipeline before the pod disappeared.

## Outcome

The main thing this bought me is not having to trust every task individually. Instead of reasoning about whether a specific agent run is safe, I only have to reason about whether the sandbox is safe, once, and then every task inherits it. That's a much smaller and much more auditable surface — the NetworkPolicy and RBAC bindings are a handful of YAML files I can read in a few minutes, versus trying to audit arbitrary agent behavior after the fact.

It also forced some useful discipline: because the sandbox has no durable state and no cluster access, anything the agent needs — a Git identity, an API key, network reachability to a specific service — has to be declared explicitly rather than assumed. That's more upfront ceremony per task type, but it means the failure mode for a bad or compromised task is "this Job's egress gets refused" rather than "something touched my cluster."

The one thing I'd still like to improve is visibility into *why* an egress request got dropped — right now a blocked connection just looks like a timeout from inside the pod, which makes debugging a legitimately-needed new egress rule more annoying than it should be. Better structured logging of NetworkPolicy denials is next on the list.
