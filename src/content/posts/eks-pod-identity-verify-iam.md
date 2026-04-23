---
title: "Verifying the IAM Role Attached to a Pod with EKS Pod Identity"
date: 2026-04-22
description: "Poking the Pod Identity Agent from inside a running pod to confirm which IAM role you actually got, with curl, wget, and a debug sidecar fallback for distroless containers"
author: "Samuel Wibrow"
tags: [aws, eks, kubernetes, iam, pod-identity]
---

When you wire up [EKS Pod Identity](https://docs.aws.amazon.com/eks/latest/userguide/pod-identities.html), the Pod Identity Agent injects two environment variables into every matched pod:

```shell
AWS_CONTAINER_CREDENTIALS_FULL_URI=http://169.254.170.23/v1/credentials
AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE=/var/run/secrets/pods.eks.amazonaws.com/serviceaccount/eks-pod-identity-token
```

The AWS SDKs know to read the token from that file and call the URI to fetch short-lived credentials. That works great, until something doesn't and you're left wondering *which* role the pod actually assumed. Did the association match? Did the service account name line up? Is the agent even running on this node?

You can answer that in one call without installing the AWS CLI.

## The one-liner

If the pod has `curl`:

```shell
curl -sH "Authorization: $(cat $AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE)" \
     $AWS_CONTAINER_CREDENTIALS_FULL_URI
```

The agent responds with the assumed role ARN and a temporary credential set:

```json
{
  "AccessKeyId": "ASIA...",
  "SecretAccessKey": "...",
  "Token": "...",
  "AccountId": "111111111111",
  "Expiration": "2026-04-22T12:34:56Z",
  "RoleArn": "arn:aws:iam::111111111111:role/grafana-s3-reader"
}
```

`RoleArn` is the bit you care about. If it matches what you configured in the Pod Identity association, you're done.

## When curl isn't around

Plenty of minimal images ship without curl. `wget` from BusyBox works fine:

```shell
wget -qO- --header="Authorization: $(cat $AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE)" \
     $AWS_CONTAINER_CREDENTIALS_FULL_URI
```

Alpine-based images (including Grafana's official one at the time of writing) give you wget by default.

If you only have `/dev/tcp` (bash) you can even craft the HTTP request yourself, but at that point you're working too hard:

```shell
exec 3<>/dev/tcp/169.254.170.23/80
printf 'GET /v1/credentials HTTP/1.1\r\nHost: 169.254.170.23\r\nAuthorization: %s\r\nConnection: close\r\n\r\n' \
  "$(cat $AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE)" >&3
cat <&3
```

## When the container has nothing

Distroless images, scratch images, and anything that's been hardened down to the binary won't even give you a shell. This is where [ephemeral debug containers](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/#ephemeral-container) earn their keep.

Say you want to check the IAM role Grafana is using. `kubectl debug` injects a sidecar into the running pod, sharing its process namespace and — crucially — its environment:

```shell
kubectl debug -n monitoring pod/grafana-0 \
  --image=amazon/aws-cli:latest \
  --target=grafana \
  -it -- \
  aws sts get-caller-identity
```

A few things to unpack:

- `--target=grafana` attaches to the PID namespace of the `grafana` container so the debug container can see its processes. It does **not** copy the target's env vars.
- The Pod Identity Agent only injects env vars into containers matched by its mutating webhook at admission time. An ephemeral container added later won't get `AWS_CONTAINER_CREDENTIALS_FULL_URI` automatically.

So you need to pass them through explicitly. The cleanest way is a small override:

```shell
kubectl debug -n monitoring pod/grafana-0 \
  --image=amazon/aws-cli:latest \
  --target=grafana \
  --profile=general \
  -it -- \
  sh -c '
    export AWS_CONTAINER_CREDENTIALS_FULL_URI=http://169.254.170.23/v1/credentials
    export AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE=/var/run/secrets/pods.eks.amazonaws.com/serviceaccount/eks-pod-identity-token
    aws sts get-caller-identity
  '
```

That only works if the service account token projection is visible to the debug container. It usually isn't, because projected volumes belong to the original pod spec.

The reliable move is to skip `kubectl debug` and just run a throwaway pod with the same service account:

```shell
kubectl run iam-check \
  -n monitoring \
  --rm -it \
  --restart=Never \
  --image=amazon/aws-cli:latest \
  --overrides='{
    "spec": {
      "serviceAccountName": "grafana"
    }
  }' \
  -- aws sts get-caller-identity
```

Because the pod uses Grafana's service account, the Pod Identity Agent webhook mutates it the same way and injects the credentials. `aws sts get-caller-identity` then prints the assumed role ARN:

```json
{
    "UserId": "AROA...:botocore-session-1745332496",
    "Account": "111111111111",
    "Arn": "arn:aws:sts::111111111111:assumed-role/grafana-s3-reader/botocore-session-1745332496"
}
```

Same answer, different route. You're proving two things at once: the association is working, and the role has whatever permissions the next `aws` command tests.

## A quick sanity checklist

If `RoleArn` comes back wrong or the request fails:

1. **`kubectl get pods -n kube-system -l app.kubernetes.io/name=eks-pod-identity-agent`** — agent must be running on the node the pod landed on. It's a DaemonSet; a failed node taint or tolerations mismatch is the usual culprit.
2. **`aws eks list-pod-identity-associations --cluster-name <name>`** — verify the association targets the right namespace and service account. Typos here are silent; the pod just gets no credentials and falls back to whatever the SDK finds next (often nothing).
3. **The service account name in the pod spec matches the association exactly.** Helm charts with `serviceAccount.create: false` plus a custom name are a classic trap.
4. **Trust policy.** Pod Identity uses `pods.eks.amazonaws.com` as the service principal — not the OIDC federated principal IRSA uses. Roles copied over from an IRSA setup will fail to assume.

## Why bother when the SDK does this for you?

Because when something breaks in production, "the SDK says access denied" tells you nothing. Hitting the credentials endpoint directly separates three failure modes:

- **No response / connection refused** → agent isn't reachable, node-level problem.
- **Response but wrong `RoleArn`** → association is wrong or a different SA is in use.
- **Correct `RoleArn` but AWS call fails** → IAM policy problem, not a Pod Identity problem.

Three minutes of curl saves an hour of guessing.
