---
title: "Building a Kubernetes Operator for the sake of building a Kubernetes Operator"
date: 2025-05-28
description: "A simple operator to sync Terraform outputs into Kubernetes ConfigMaps and Secrets"
author: "Samuel Wibrow"
tags: [kubernetes, operator, kubebuilder, claude, ai]
---

## The problem

At work we recently moved application deployment from Terraform to ArgoCD. Good move — except now there's a gap. Things like our AWS Managed Prometheus endpoint live in Terraform state, but the apps that need that URL are now deployed via Argo with no idea Terraform exists.

External Secrets Operator solves it for secrets, and we do use it. But for non-sensitive outputs — endpoints, ARNs, region-specific bucket names — going through Secrets Manager felt like wrapping a string in three layers of bubble wrap. I wanted something dumber: read the Terraform state, dump the outputs into a ConfigMap, done.

## The operator

I'd been looking for an excuse to build a Kubernetes operator from scratch. Looked at [Metacontroller](https://metacontroller.github.io/metacontroller/intro.html) for about an hour, then settled on [Kubebuilder](https://book.kubebuilder.io/) — same framework as Karpenter, well-trodden path, sensible defaults.

The result is **TFOut** — an operator that reads Terraform state from S3 and projects the outputs into ConfigMaps (or Secrets, when the output is marked sensitive).

### Quick Example

Here's all you need to sync your Terraform outputs:

```yaml
apiVersion: tfout.wibrow.net/v1alpha1
kind: TerraformOutputs
metadata:
  name: my-terraform-outputs
spec:
  backends:
    - s3:
        bucket: my-terraform-state
        key: prod/terraform.tfstate
        region: eu-west-1
        roleArn: arn:aws:iam::123456789012:role/terraform-sync-role
  syncInterval: 5m
  targetNamespace: production
```

All your Terraform outputs become ConfigMaps and Secrets. Sensitive outputs land in Secrets; everything else in ConfigMaps.

## How it works

The reconciliation loop is the boring kind of simple:

1. Watch `TerraformOutputs` resources.
2. Fetch state from S3 — but only if the object's ETag changed since the last sync. No point re-downloading 200KB of state every five minutes when nothing's moved.
3. Parse the outputs.
4. Create or update the matching ConfigMap and Secret.
5. If multiple backends are configured, merge them by output key (last writer wins, with a warning log).

The ETag check is the only mildly clever bit. The rest is just `client.Update()` and try not to break.

### Example Output

```bash
$ kubectl get configmap my-terraform-outputs -o yaml
data:
  api_endpoint: https://api.example.com
  cdn_domain: cdn.example.com
  database_host: postgres.internal.example.com
```

## Multi-backend, because real infra is messy

Real infra is never one Terraform state. There's the platform state, the per-environment state, the shared networking state someone set up in 2019 and nobody touches. TFOut accepts a list of backends and merges them:

```yaml
backends:
  - s3:
      bucket: prod-state
      key: prod/terraform.tfstate
  - s3:
      bucket: other-state
      key: other/terraform.tfstate
```

Conflicting keys are logged loudly. You will eventually have a conflict. The operator doesn't try to be clever about it — it picks the last one and tells you.

## Get started

The code is on GitHub: **[github.com/swibrow/tfout](https://github.com/swibrow/tfout)**.

```bash
helm repo add tfout https://swibrow.github.io/tfout
helm repo update
helm install tfout tfout/tfout --namespace tfout --create-namespace
```

## AWS Pod Identity Setup

Configure IAM roles for secure S3 access:

```hcl
module "pod_identity" {
  source  = "terraform-aws-modules/eks-pod-identity/aws"
  version = "1.11.0"

  name                 = "tfout"
  description          = "Test tfout"
  attach_custom_policy = true

  association_defaults = {
    namespace       = "tfout"
    service_account = "tfout"
  }
  associations = {
    platform = {
      cluster_name = module.k8s_platform.eks.cluster_name
    }
  }

  policy_statements = [
    {
      effect = "Allow"
      actions = [
        "s3:*"
      ]
      resources = ["*"]
    }
  ]
}
```

## Complete Example

Here's a full example with multiple backends and custom naming:

```yaml
apiVersion: tfout.wibrow.net/v1alpha1
kind: TerraformOutputs
metadata:
  name: platform-outputs
spec:
  backends:
    # Production state
    - s3:
        bucket: my-terraform-state
        key: prod/terraform.tfstate
        region: eu-west-1
        roleArn: arn:aws:iam::123456789012:role/terraform-sync-role

    # Shared infrastructure state
    - s3:
        bucket: my-terraform-state
        key: shared/terraform.tfstate
        region: eu-west-1
        roleArn: arn:aws:iam::123456789012:role/terraform-sync-role

  syncInterval: 5m
  targetNamespace: production
  configMapName: platform-config
  secretName: platform-secrets
```

### Using the Outputs in Your Apps

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  containers:
  - name: app
    env:
    - name: API_ENDPOINT
      valueFrom:
        configMapKeyRef:
          name: platform-config
          key: api_endpoint
    - name: DATABASE_PASSWORD
      valueFrom:
        secretKeyRef:
          name: platform-secrets
          key: database_password
```

## What I learned

Kubebuilder is genuinely good now. The CRD scaffolding, controller-runtime, and the whole reconcile-loop pattern are well-trodden enough that you spend your time on the actual problem instead of arguing with the framework. The hardest part of TFOut wasn't the operator bits — it was deciding what to do when two states define the same output key, and that's a product decision, not a framework one.

Was building this strictly necessary? Absolutely not. External Secrets Operator covers the secret case. We probably could have abused ConfigMaps and a CronJob for the rest. But sometimes you build the operator just because you wanted to know what was inside the box, and that's a perfectly good reason.
