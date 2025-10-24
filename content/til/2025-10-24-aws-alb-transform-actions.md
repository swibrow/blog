---
title: "AWS ALB Transform Actions for URL Rewrites"
date: 2025-10-24
draft: false
---

AWS ALB now supports URL rewrites using the **transform action** - no need to rely on redirects or backend rewrites anymore! This is particularly useful for path-based routing scenarios where you want to modify the request before it reaches your backend.

## What can you do?

Transform actions let you modify request headers and paths using pattern matching and variable substitution:

- Rewrite paths (e.g., `/old/path` → `/new/path`)
- Add/modify/remove headers
- Append query strings
- Use pattern matching with wildcards and capture groups

## Example: AWS Load Balancer Controller

Here's how to use transforms with the AWS Load Balancer Controller for Kubernetes:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-rewrite
  annotations:
    alb.ingress.kubernetes.io/actions.rewrite-api: |
      {
        "Type": "forward",
        "ForwardConfig": {
          "TargetGroups": [{"ServiceName": "api-service", "ServicePort": "80"}]
        },
        "Transform": {
          "Path": {
            "Pattern": "/v1/*",
            "Replacement": "/api/v2/$1"
          }
        }
      }
spec:
  ingressClassName: alb
  rules:
  - http:
      paths:
      - path: /v1
        pathType: Prefix
        backend:
          service:
            name: rewrite-api
            port:
              name: use-annotation
```

In this example:
- Requests to `/v1/users` get rewritten to `/api/v2/users` before reaching the backend
- The `$1` captures everything after `/v1/` and substitutes it into the replacement pattern

## Why is this useful?

- **API versioning**: Handle multiple API versions at the ALB layer
- **Legacy migrations**: Rewrite old paths to new endpoints without changing client code
- **Microservices routing**: Route to services with different path structures
- **Cleaner URLs**: Present user-friendly URLs while using different internal paths

## Learn more

- [AWS ALB Transform Actions docs](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/rule-transforms.html)
- [AWS Load Balancer Controller annotations](https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.14/guide/ingress/annotations/#transforms)
