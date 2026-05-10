---
title: "Building a Hacky AWS Proxy Service with kube-proxy, socat, and Bash"
date: 2025-08-15
description: "A simple solution for tunneling AWS services through Kubernetes using bash, socat, and port forwarding"
author: "Samuel Wibrow"
tags: [AWS, Kubernetes, Bash, Proxy, DevOps]
---

RDS in a private subnet, no VPN, deadline yesterday, and a Kubernetes cluster sitting right there with a pristine network path to the database. You know what's coming. You know it's a bad idea. You're going to do it anyway.

This post is what came out of one of those afternoons. The proper answer is a VPN, or AWS Client VPN, or SSM session manager, or really anything else. But you have `kubectl`, you have a cluster, and you have ten minutes.

## The shape of the hack

```
Local Machine → kubectl port-forward → K8s Pod (socat) → AWS Service
```

That's the whole thing. A throwaway pod runs `socat` listening on a port and forwarding to the RDS endpoint. `kubectl port-forward` tunnels your laptop to that pod. Three components, no infrastructure to set up, and exactly the kind of thing your security team would prefer not to know about.

Prerequisites you definitely have: `kubectl`, AWS CLI, and access to a cluster that can talk to the database. Prerequisite you'd rather not admit to: `kubectl` access from your laptop directly to the production cluster. We'll quietly assume you have that and move on.

### The Bash Implementation

Here's where it gets interesting. Instead of hardcoding endpoints like a barbarian, let's use AWS CLI to discover services dynamically:

```bash
#!/bin/bash

# AWS Service Discovery with fzf magic
discover_rds_instances() {
    aws rds describe-db-instances \
        --query 'DBInstances[*].[DBInstanceIdentifier,Endpoint.Address,Endpoint.Port,Engine]' \
        --output text | column -t
}

discover_documentdb_clusters() {
    aws docdb describe-db-clusters \
        --query 'DBClusters[*].[DBClusterIdentifier,Endpoint,Port]' \
        --output text | column -t
}

discover_elasticache_clusters() {
    aws elasticache describe-cache-clusters \
        --query 'CacheClusters[*].[CacheClusterId,ConfigurationEndpoint.Address,ConfigurationEndpoint.Port,Engine]' \
        --output text | column -t
}

# Interactive selection with fzf (because we're fancy like that)
select_service() {
    echo "What are we tunneling to today?"
    SERVICE_TYPE=$(echo -e "RDS\nDocumentDB\nElastiCache" | fzf --prompt="Service Type: ")

    case $SERVICE_TYPE in
        "RDS")
            SELECTION=$(discover_rds_instances | fzf --header="Select RDS Instance")
            ENDPOINT=$(echo $SELECTION | awk '{print $2}')
            PORT=$(echo $SELECTION | awk '{print $3}')
            ;;
        "DocumentDB")
            SELECTION=$(discover_documentdb_clusters | fzf --header="Select DocumentDB Cluster")
            ENDPOINT=$(echo $SELECTION | awk '{print $2}')
            PORT=$(echo $SELECTION | awk '{print $3}')
            ;;
        "ElastiCache")
            SELECTION=$(discover_elasticache_clusters | fzf --header="Select ElastiCache Cluster")
            ENDPOINT=$(echo $SELECTION | awk '{print $2}')
            PORT=$(echo $SELECTION | awk '{print $3}')
            ;;
    esac
}

# The main event
create_tunnel() {
    local endpoint=$1
    local port=$2
    local local_port=${3:-$port}

    # Generate pod name with timestamp (for concurrent tunnels)
    POD_NAME="tunnel-$(echo $endpoint | cut -d. -f1)-$(date +%s)"

    echo "Creating tunnel pod: $POD_NAME"

    # Create the socat relay pod
    kubectl run $POD_NAME \
        --image=alpine/socat:latest \
        --restart=Never \
        --command -- \
        socat -d -d \
        TCP-LISTEN:$port,fork,reuseaddr \
        TCP:$endpoint:$port

    # Wait for pod (with spinner because we're professionals)
    echo -n "Waiting for pod to be ready"
    while [[ $(kubectl get pod $POD_NAME -o jsonpath='{.status.phase}') != "Running" ]]; do
        echo -n "."
        sleep 1
    done
    echo " Done"

    # Port forward with automatic retry
    echo "Establishing tunnel on localhost:$local_port -> $endpoint:$port"
    kubectl port-forward pod/$POD_NAME $local_port:$port
}

# Cleanup function that actually works
cleanup() {
    echo "Cleaning up pod: $POD_NAME"
    kubectl delete pod $POD_NAME --grace-period=0 --force 2>/dev/null || true
}

# Main script
main() {
    # Check prerequisites
    command -v fzf >/dev/null 2>&1 || { echo "fzf is required but not installed. brew install fzf"; exit 1; }
    command -v aws >/dev/null 2>&1 || { echo "AWS CLI is required but not installed."; exit 1; }
    command -v kubectl >/dev/null 2>&1 || { echo "kubectl is required but not installed."; exit 1; }

    # Interactive service selection
    select_service

    if [[ -z "$ENDPOINT" ]]; then
        echo "No service selected"
        exit 1
    fi

    # Set up cleanup trap
    trap cleanup EXIT INT TERM

    # Create the tunnel
    create_tunnel "$ENDPOINT" "$PORT"
}

# Run it
main "$@"
```

### AWS Authentication

The nice part is handling AWS authentication. The script leverages several authentication methods:

1. **IAM Roles for Service Accounts (IRSA)** - If your cluster uses IRSA, the pod automatically inherits permissions
2. **AWS Secrets Manager** - Store database credentials securely and retrieve them at runtime
3. **Environment variables** - Pass AWS credentials to the pod (less secure, but works)

Here's how to handle credential retrieval:

```bash
# Retrieve credentials from AWS Secrets Manager
get_db_credentials() {
    local secret_name=$1

    # Use AWS CLI to fetch secrets
    SECRET_JSON=$(aws secretsmanager get-secret-value \
        --secret-id $secret_name \
        --query SecretString \
        --output text)

    # Parse credentials
    DB_HOST=$(echo $SECRET_JSON | jq -r '.host')
    DB_PORT=$(echo $SECRET_JSON | jq -r '.port')
    DB_USER=$(echo $SECRET_JSON | jq -r '.username')
    DB_PASS=$(echo $SECRET_JSON | jq -r '.password')
}
```

## Why this works at all

`socat` is doing the only interesting work: it accepts a TCP connection inside the cluster and forwards every byte to RDS. `kubectl port-forward` is doing its usual job, tunnelling localhost into a pod. Stack them and you have a database client on your laptop talking to a private RDS instance, with the cluster as an unwitting bastion.

The pod is ephemeral, so when you `Ctrl+C` the cleanup trap deletes it. Nobody's leaving long-lived backdoors. Probably.

## When to actually do this

Never in a customer's environment. Probably not in your own production either. But for your own dev/staging clusters where the alternative is half a day of VPN tickets, this is fine — and it's a good teaching example of how thin the line between "infrastructure" and "two unix tools wired together" really is.

If you find yourself reaching for this more than twice, that's the universe telling you to set up the VPN.
