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

## The Problem

At my current $job, we recently migrated to ArgoCD from Terraform for application deployments 🙏. With that came an interesting challenge: **how do we pass Terraform outputs into Kubernetes manifests?**

For example, our AWS Managed Prometheus endpoint lives in Terraform state, but our apps deployed via ArgoCD need that URL. Sure, we could use External Secrets Operator (and we do!), but it adds an extra layer of indirection when you just want to see what values are being injected into pods.

## The Solution: TFOut

After exploring what's hot in 2025 for building Kubernetes operators, I had a dabble with [Metacontroller](https://metacontroller.github.io/metacontroller/intro.html) but ultimately chose [Kubebuilder](https://book.kubebuilder.io/) - the same framework powering projects like Karpenter.

So Claude and I vibed out for the afternoon and built **TFOut** - a simple operator that syncs Terraform state outputs from S3 directly into Kubernetes ConfigMaps and Secrets.

### 🎯 Quick Example

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

✨ **Result**: All your Terraform outputs are automatically available as ConfigMaps and Secrets in Kubernetes. Sensitive outputs go into Secrets, the rest into ConfigMaps.

## 📦 What's in the Box?

Building a production-ready operator in an afternoon? Here's what Claude and I shipped:

### Core Features
- 🚀 **Operator** - Go + Kubebuilder framework
- 📊 **Helm charts** - Easy deployment
- 📚 **Documentation** - MkDocs + GitHub Pages
- 🔄 **CI/CD** - GitHub Actions workflows
- 🧪 **E2E tests** - Kind-based testing
- 📈 **Observability** - Prometheus metrics + Grafana dashboards
- 🔐 **Security** - Full RBAC setup

## 🔧 How It Works

The reconciliation loop is beautifully simple:

1. **Watch** - Monitor `TerraformOutputs` resources
2. **Fetch** - Pull state from S3 (only if ETag changed)
3. **Parse** - Extract all Terraform outputs
4. **Sync** - Create/update ConfigMaps and Secrets
5. **Merge** - Handle multiple backends gracefully

### Example Output

```bash
$ kubectl get configmap my-terraform-outputs -o yaml
data:
  api_endpoint: https://api.example.com
  cdn_domain: cdn.example.com
  database_host: postgres.internal.example.com
```

## 💡 Development Journey

The process was refreshingly straightforward:

1. **Scaffold** - Kubebuilder did the heavy lifting
2. **Focus** - Wrote the core reconciliation logic
3. **Iterate** - Claude helped with boilerplate (Helm templates, GitHub Actions, tests)
4. **Polish** - Added metrics, multi-backend support, and proper error handling

## 🌟 Production-Ready Features

### 🔍 Smart Change Detection
Uses S3 ETags to avoid unnecessary syncs - only fetches when state actually changes.

### 🔀 Multi-Backend Support
Merge outputs from multiple Terraform states seamlessly:
```yaml
backends:
  - s3:
      bucket: prod-state
      key: prod/terraform.tfstate
  - s3:
      bucket: other-state
      key: other/terraform.tfstate
```

### 📊 Full Observability
- Sync duration metrics
- Error count tracking
- Output count monitoring
- Grafana dashboard included!

### 🔒 Enterprise Security
- IAM roles for S3 access
- Full RBAC implementation
- Automatic sensitive data detection
- Secure Secret creation

### ✅ Comprehensive Testing
- Unit tests with high coverage
- E2E tests using Kind clusters
- Integration tests for S3 operations

## 🚀 Get Started

### Installation

The code is on GitHub: **[github.com/swibrow/tfout](https://github.com/swibrow/tfout)** ⭐

```bash
# Add the Helm repository
helm repo add tfout https://swibrow.github.io/tfout
helm repo update

# Install the operator
helm install tfout tfout/tfout \
  --namespace tfout \
  --create-namespace
```

## 🔐 AWS Pod Identity Setup

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

## 📝 Complete Example

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

## 🎯 Key Takeaways

1. **Kubernetes operators aren't scary** - With modern tooling, you can build production-ready operators quickly
2. **AI accelerates development** - Claude handled the boilerplate while I focused on business logic
3. **Sometimes simple is better** - Not every problem needs a complex solution
4. **The ecosystem has matured** - Tools like Kubebuilder make operator development accessible

## 🤝 Join the Fun!

If you made it this far, thanks for reading! I hope this inspires you to build that operator you've been thinking about. Your mum will definitely be impressed! 😄

Got questions? Find me on:
- **GitHub**: [github.com/swibrow/tfout](https://github.com/swibrow/tfout)
- **LinkedIn**: [https://www.linkedin.com/in/samuelwibrow/](https://www.linkedin.com/in/samuelwibrow/)

---

*Built with ❤️ and Claude in an afternoon. Sometimes the best tools are the ones that scratch your own itch.*

