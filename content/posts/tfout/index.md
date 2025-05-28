+++
author = "Samuel Wibrow"
title = "Building a Kubernetes Operator for the sake of building a Kubernetes Operator"
date = "2025-05-28"
description = "A simple operator to sync Terraform outputs into Kubernetes ConfigMaps and Secrets"
tags = [
    "kubernetes",
    "operator",
    "kubebuilder",
    "claude",
    "ai"
]
draft = false
+++

# Building a Kubernetes Operator for the sake of building a Kubernetes Operator

In my current $job, we recently migrated to ArgoCD from Terraform for application deployments :pray: and with that came the issue of passing terraform outputs into helm inputs. e.g. AWS Managed Prometheus Endpoint. So I spent some time reading about what the hot tool was in 2025 for building a Kubernetes operator. I had a dabble with [Metacontroller](https://metacontroller.github.io/metacontroller/intro.html) but in the end I decided to run with [Kubebuilder](https://book.kubebuilder.io/) as I've seen a few projects already using the framework (Karpenter). So claude and I vibed out for the afternoon and built an operator.

## TL;DR

TFOut - a simple operator that syncs Terraform State outputs stored in S3 into Kubernetes ConfigMaps and Secrets. Nothing crazy, but could be useful maybe.. (we already are using External Secrets Operator which acts as a decent bridge with the only pitfall of being a little bit more effort to view what's injected into the pods).

Simple example of a `TerraformOutputs` resource:

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

And now, hopefully.. all your Terraform outputs are available as ConfigMaps and Secrets in Kubernetes. Sensitive outputs automatically go into Secrets, the rest into ConfigMaps.

## The Whole Package

What you get in an afternoon (with the help of our good ol' friend Claude):
- The operator code (Go + Kubebuilder)
- Helm charts for deployment
- Documentation with mkdocs and GitHub Pages
- GitHub Actions for CI/CD
- E2E tests with Kind
- Prometheus metrics + Grafana dashboards
- RBAC setup

## How It Works

The operator watches for `TerraformOutputs` resources and:
1. Fetches the Terraform state from S3 (if the ETag has changed or it's the first sync)
2. Parses all outputs
3. Creates/updates ConfigMaps for non-sensitive values
4. Creates/updates Secrets for sensitive values
5. Handles multiple backends with proper merging

Example output:

```bash
$ kubectl get configmap my-terraform-outputs -o yaml
data:
  api_endpoint: https://api.example.com
  cdn_domain: cdn.example.com
  database_host: postgres.internal.example.com
```

## The Development Process

Started with Kubebuilder scaffolding, then focused on the actual business logic. The reconciliation loop is straightforward:

Used AI assistance throughout to handle the boilerplate - especially useful for helm templates, GitHub Actions workflows, and test setup.

Fix all the issues that came up with the help of AI, and then added some extra features like metrics and multi-backend support.

## Ready Features

- **Change Detection**: Uses S3 ETags to avoid unnecessary syncs
- **Multi-Backend Support**: Merge outputs from multiple Terraform states
- **Metrics**: Sync duration, error counts, output counts - all exposed for Prometheus
- **Security**: IAM roles for S3 access, RBAC, sensitive data handling
- **Testing**: Unit tests + E2E tests that spin up a Kind cluster

## Key Takeaways

1. **Sometimes it's fun to turn the tap on with a hammer**

## Give it a crack

If you've been putting off building that operator or controller - maybe give it a shot. The Kubernetes ecosystem has matured enough that you can build tools quickly.

The code is here if you want to check it out: [github.com/swibrow/tfout](https://github.com/swibrow/tfout)

Install with Helm:

```bash
helm repo add tfout https://swibrow.github.io/tfout
helm repo update
helm install tfout tfout/tfout --namespace tfout --create-namespace
```

## Terraform Module for Pod Identity

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
    - s3:
        bucket: my-other-terraform-state
        key: staging/terraform.tfstate
        region: eu-west-1
        roleArn: arn:aws:iam::123456789012:role/terraform-sync-role
  syncInterval: 5m
  targetNamespace: production
  configMapName: terraform-outputs
  secretName: terraform-secrets
```

Well, if you made it this far, thanks for reading! I hope this inspires you to build something that you can show your mum as I'm sure she'll be impressed with your operator. If you have any questions or feedback, feel free to reach out on GitHub or LinkedIn.

