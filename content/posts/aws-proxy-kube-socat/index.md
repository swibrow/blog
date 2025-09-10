---
title: "Building a Hacky AWS Proxy Service with kube-proxy, socat, and Bash"
date: "2025-08-15"
description: "A simple solution for tunneling AWS services through Kubernetes using bash, socat, and port forwarding"
tags: ["AWS", "Kubernetes", "Bash", "Proxy", "DevOps"]
---

*Disclaimer: My good friend Claude wrote this post. I only created a hack and told him about it.*

Ever needed to connect to AWS services like RDS or DocumentDB from your local machine, but they're locked away in private subnets? Instead of doing something reasonable like setting up a VPN, here's a solution that involves using your production Kubernetes cluster as an impromptu bastion host. What could possibly go wrong?

## The Problem

AWS best practices dictate that databases and other sensitive services should live in private subnets, inaccessible from the public internet. While this is great for security, it makes local development a pain. Traditional solutions involve:

- VPN connections (Thats no fun)
- Bastion hosts (We already have ec2 running)
- SSH tunnels (thats so 1990s)

What if we could use our existing Kubernetes cluster as a gateway?

## The Hacky Solution

The core idea is simple and asking for trouble: deploy a temporary pod in your Kubernetes cluster that can reach AWS services, then use `kubectl port-forward` to tunnel the connection to your local machine. Here's how it works:

### Architecture Overview

```
Local Machine → kubectl port-forward → K8s Pod (socat) → AWS Service
```

The magic happens in three parts:

1. **Kubernetes endpoint** (must be public) - Your cluster's API server
2. **Proxy pod** - A lightweight container running socat
3. **Local port forwarding** - kubectl handles the tunnel

### Prerequisites: The Security Nightmare

Before we dive into the code, let's talk about what you need to make this work. Spoiler alert: it requires a security posture that would make your CISO wake up in cold sweats.

You'll need:
- A Kubernetes cluster where you can create pods (preferably in a namespace where important things live)
- AWS credentials with permissions to list and connect to your databases
- `kubectl` access from your local machine to production (what could go wrong?)
- The ability to run random Alpine containers that open network sockets

If your security team is reading this, maybe stop here and pretend you never saw it.

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

    echo "🚇 Creating tunnel pod: $POD_NAME"

    # Create the socat relay pod
    kubectl run $POD_NAME \
        --image=alpine/socat:latest \
        --restart=Never \
        --command -- \
        socat -d -d \
        TCP-LISTEN:$port,fork,reuseaddr \
        TCP:$endpoint:$port

    # Wait for pod (with spinner because we're professionals)
    echo -n "⏳ Waiting for pod to be ready"
    while [[ $(kubectl get pod $POD_NAME -o jsonpath='{.status.phase}') != "Running" ]]; do
        echo -n "."
        sleep 1
    done
    echo " ✅"

    # Port forward with automatic retry
    echo "🔌 Establishing tunnel on localhost:$local_port → $endpoint:$port"
    kubectl port-forward pod/$POD_NAME $local_port:$port
}

# Cleanup function that actually works
cleanup() {
    echo "🧹 Cleaning up pod: $POD_NAME"
    kubectl delete pod $POD_NAME --grace-period=0 --force 2>/dev/null || true
}

# Main script
main() {
    # Check prerequisites
    command -v fzf >/dev/null 2>&1 || { echo "❌ fzf is required but not installed. brew install fzf"; exit 1; }
    command -v aws >/dev/null 2>&1 || { echo "❌ AWS CLI is required but not installed."; exit 1; }
    command -v kubectl >/dev/null 2>&1 || { echo "❌ kubectl is required but not installed."; exit 1; }

    # Interactive service selection
    select_service

    if [[ -z "$ENDPOINT" ]]; then
        echo "❌ No service selected"
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

### Making it Production-Ready(ish)

The full implementation includes several enhancements that make it almost responsible:

```bash
# Enhanced service discovery with filtering
discover_services_with_tags() {
    local tag_filter=$1

    # Find RDS instances by tag
    aws rds describe-db-instances \
        --query "DBInstances[?Tags[?Key=='Environment' && Value=='$tag_filter']].[DBInstanceIdentifier,Endpoint.Address,Endpoint.Port]" \
        --output text
}

# Multi-region support (because why limit the chaos?)
discover_all_regions() {
    aws ec2 describe-regions --query 'Regions[*].RegionName' --output text | tr '\t' '\n' | \
    while read region; do
        echo "=== Region: $region ==="
        AWS_REGION=$region discover_rds_instances
    done
}

# Concurrent tunnel management
manage_tunnels() {
    # List active tunnels
    list_tunnels() {
        kubectl get pods -l app=db-tunnel -o json | \
        jq -r '.items[] | "\(.metadata.name)\t\(.metadata.labels.service)\t\(.metadata.creationTimestamp)"' | \
        column -t
    }

    # Kill specific tunnel
    kill_tunnel() {
        local tunnel_name=$1
        kubectl delete pod $tunnel_name --grace-period=0 --force
    }

    # Kill all tunnels (nuclear option)
    kill_all_tunnels() {
        kubectl delete pods -l app=db-tunnel --grace-period=0 --force
    }
}

# Connection testing with retry logic
test_connection() {
    local host=$1
    local port=$2
    local retries=5

    while (( retries > 0 )); do
        if nc -z $host $port 2>/dev/null; then
            echo "✅ Connection successful"
            return 0
        fi
        echo "⏳ Retrying... ($retries attempts left)"
        ((retries--))
        sleep 2
    done

    echo "❌ Connection failed"
    return 1
}

# Advanced fzf integration
advanced_selection() {
    # Multi-select with preview
    aws rds describe-db-instances --output json | \
    jq -r '.DBInstances[] | [.DBInstanceIdentifier, .Engine, .DBInstanceStatus, .Endpoint.Address] | @tsv' | \
    fzf --multi \
        --preview 'aws rds describe-db-instances --db-instance-identifier {1} --output json | jq .' \
        --preview-window right:50% \
        --header "Select databases (TAB for multi-select)"
}
```

## Security Considerations

While this approach is undeniably hacky, it can be made reasonably secure:

1. **Temporary pods** - Pods are ephemeral and cleaned up after use
2. **RBAC controls** - Limit who can create pods in the namespace
3. **Network policies** - Restrict pod egress to specific AWS services
4. **Audit logging** - Track all kubectl commands for compliance

## Future Improvements

While the bash implementation works, there's room for improvement:

### 1. Rewrite Client in Go

A Go client would provide:
- Better error handling
- Concurrent connection management
- Native Kubernetes API integration
- Cross-platform binary distribution

```go
// Pseudo-code for Go implementation
type ProxyManager struct {
    k8sClient kubernetes.Interface
    awsClient aws.Client
}

func (pm *ProxyManager) CreateTunnel(service AWSService) (*Tunnel, error) {
    // Create pod spec with socat
    pod := pm.buildProxyPod(service)

    // Deploy to cluster
    created, err := pm.k8sClient.CoreV1().Pods(namespace).Create(pod)

    // Set up port forwarding
    return pm.establishTunnel(created)
}
```

### 2. Dedicated Proxy Server

Instead of socat, build a purpose-built proxy server:

```go
// Multi-protocol proxy server
type ProxyServer struct {
    authMethods []AuthMethod
    protocols   map[string]ProtocolHandler
}

// Support multiple auth methods
type AuthMethod interface {
    Authenticate(ctx context.Context) (*Credentials, error)
}

// Handle different protocols
type ProtocolHandler interface {
    Proxy(src, dst net.Conn) error
}
```

This would enable:
- Multiple simultaneous connections
- Protocol-aware proxying (SQL query logging, etc.)
- Built-in authentication handling
- Metrics and monitoring

### 3. TTL on Proxy Containers

Implement automatic cleanup with TTLs:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: aws-proxy
  annotations:
    proxy.ttl: "3600"  # 1 hour
spec:
  containers:
  - name: proxy
    image: custom-proxy:latest
    lifecycle:
      preStop:
        exec:
          command: ["/cleanup.sh"]
```

A controller could watch for expired pods and clean them up automatically.

## Conclusion

This hacky solution demonstrates the power of combining simple tools in creative ways. While it's not enterprise-ready , it solves a real problem with minimal dependencies. The bash implementation serves as a great prototype for a more robust solution.

The key takeaways:
- Kubernetes can be an effective proxy layer
- Bash + standard Unix tools can prototype complex systems
- Security doesn't have to be sacrificed for convenience
- Sometimes the "wrong" solution is the right one for your use case



## Try It Yourself

Want to experience the thrill of explaining this to your security team? Here's a one-liner that combines everything:

```bash
# The full experience with fzf selection
aws rds describe-db-instances --output json | \
jq -r '.DBInstances[] | "\(.DBInstanceIdentifier)|\(.Endpoint.Address):\(.Endpoint.Port)"' | \
fzf --delimiter='|' --preview 'echo "Connecting to: {2}"' | \
awk -F'|' '{print $2}' | \
xargs -I {} sh -c 'kubectl run tunnel-$RANDOM --image=alpine/socat --restart=Never -- socat TCP-LISTEN:5432,fork,reuseaddr TCP:{} && kubectl port-forward pod/tunnel-$RANDOM 5432:5432'
```

Or if you prefer the interactive experience, grab the full script and watch your AWS resources appear in a beautiful fzf interface:

```bash
#!/bin/bash

# Handle command line arguments
if [ "$1" = "--version" ] || [ "$1" = "-v" ]; then
    print_version
    exit 0
fi

if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "ktunnel - AWS service tunneling tool for Kubernetes"
    echo ""
    echo "Usage: ktunnel [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -v, --version  Show version information"
    echo ""
    echo "This tool creates secure tunnels to AWS services (DocumentDB, RDS, ElastiCache)"
    echo "through Kubernetes pods, making them accessible on your local machine."
    exit 0
fi

# Check dependencies
if ! check_dependencies aws jq kubectl; then
    exit 1
fi

# Verify AWS authentication
if ! verify_aws_auth; then
    exit 1
fi

# Verify kubectl context
if ! verify_kubectl_context; then
    exit 1
fi

# Simplified sanitization - just replace problematic characters
sanitize_name() {
    echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | sed 's/--*/-/g' | sed 's/^-*//;s/-*$//' | cut -c1-50
}

# Get AWS identity information
echo "Getting AWS identity..."
AWS_IDENTITY=$(aws sts get-caller-identity --output json 2>/dev/null)

if [ $? -ne 0 ]; then
    echo "Error: Unable to get AWS identity. Make sure you're authenticated with AWS."
    exit 1
fi

# Extract session name from UserId for assumed roles
AWS_USER_ID=$(echo "$AWS_IDENTITY" | jq -r '.UserId // empty')
AWS_ACCOUNT=$(echo "$AWS_IDENTITY" | jq -r '.Account // empty')
AWS_ARN=$(echo "$AWS_IDENTITY" | jq -r '.Arn // empty')

if [[ "$AWS_ARN" == *"assumed-role"* ]]; then
    RAW_USER=$(echo "$AWS_USER_ID" | sed 's/.*://')
else
    RAW_USER=$(echo "$AWS_ARN" | sed 's/.*\///')
fi

USER_NAME=$(sanitize_name "$RAW_USER")

echo "AWS Account: ${AWS_ACCOUNT}"
echo "AWS Identity: ${RAW_USER}"
echo ""

# Service selection
echo "Select service to tunnel to:"
echo "1) DocumentDB (MongoDB)"
echo "2) RDS PostgreSQL"
echo "3) RDS MySQL"
echo "4) ElastiCache Redis"
echo "5) ElastiCache Valkey"
echo ""
read -p "Select service number: " SERVICE_SELECTION

case $SERVICE_SELECTION in
    1)
        SERVICE_TYPE="documentdb"
        SERVICE_NAME="DocumentDB"
        DEFAULT_PORT=27017
        ;;
    2)
        SERVICE_TYPE="rds-postgres"
        SERVICE_NAME="RDS PostgreSQL"
        DEFAULT_PORT=5432
        ;;
    3)
        SERVICE_TYPE="rds-mysql"
        SERVICE_NAME="RDS MySQL"
        DEFAULT_PORT=3306
        ;;
    4)
        SERVICE_TYPE="elasticache-redis"
        SERVICE_NAME="ElastiCache Redis"
        DEFAULT_PORT=6379
        ;;
    5)
        SERVICE_TYPE="elasticache-valkey"
        SERVICE_NAME="ElastiCache Valkey"
        DEFAULT_PORT=6379
        ;;
    *)
        echo "Invalid selection"
        exit 1
        ;;
esac

echo "Selected: $SERVICE_NAME"
echo ""

# Fetch instances based on service type
echo "Fetching $SERVICE_NAME instances..."

# Store stderr to check for permission errors
TEMP_ERROR=$(mktemp)

case $SERVICE_TYPE in
    "documentdb")
        INSTANCES=$(aws docdb describe-db-clusters --query 'DBClusters[?Status==`available`].[DBClusterIdentifier,Endpoint]' --output text 2>"$TEMP_ERROR")
        AWS_EXIT_CODE=$?
        SECRET_FILTER="docdb\|documentdb"
        ;;
    "rds-postgres")
        INSTANCES=$(aws rds describe-db-instances --query 'DBInstances[?DBInstanceStatus==`available` && Engine==`postgres`].[DBInstanceIdentifier,Endpoint.Address]' --output text 2>"$TEMP_ERROR")
        AWS_EXIT_CODE=$?
        SECRET_FILTER="postgres\|rds"
        ;;
    "rds-mysql")
        INSTANCES=$(aws rds describe-db-instances --query 'DBInstances[?DBInstanceStatus==`available` && (Engine==`mysql` || Engine==`mariadb`)].[DBInstanceIdentifier,Endpoint.Address]' --output text 2>"$TEMP_ERROR")
        AWS_EXIT_CODE=$?
        SECRET_FILTER="mysql\|mariadb\|rds"
        ;;
    "elasticache-redis")
        INSTANCES=$(aws elasticache describe-cache-clusters --query 'CacheClusters[?CacheClusterStatus==`available` && Engine==`redis`].[CacheClusterId,RedisConfiguration.PrimaryEndpoint.Address // CacheNodes[0].Endpoint.Address]' --output text 2>"$TEMP_ERROR")
        AWS_EXIT_CODE=$?
        SECRET_FILTER="redis\|elasticache"
        ;;
    "elasticache-valkey")
        INSTANCES=$(aws elasticache describe-cache-clusters --query 'CacheClusters[?CacheClusterStatus==`available` && Engine==`valkey`].[CacheClusterId,RedisConfiguration.PrimaryEndpoint.Address // CacheNodes[0].Endpoint.Address]' --output text 2>"$TEMP_ERROR")
        AWS_EXIT_CODE=$?
        SECRET_FILTER="valkey\|elasticache"
        ;;
esac

# Check for errors
if [ $AWS_EXIT_CODE -ne 0 ]; then
    ERROR_MSG=$(cat "$TEMP_ERROR")
    rm -f "$TEMP_ERROR"

    if echo "$ERROR_MSG" | grep -q "UnauthorizedException\|AccessDenied\|is not authorized to perform"; then
        print_error "Insufficient AWS permissions to list $SERVICE_NAME instances."
        print_info "Required permission: $(echo "$ERROR_MSG" | grep -o '[a-z]*:[A-Za-z]*' | head -1 || echo "Check AWS IAM permissions")"
    else
        print_error "Failed to fetch $SERVICE_NAME instances: ${ERROR_MSG}"
    fi
    exit 1
fi

rm -f "$TEMP_ERROR"

# Check if no instances found
if [ -z "$INSTANCES" ]; then
    print_warning "No available $SERVICE_NAME instances found in this AWS account/region."
    print_info "Make sure you:"
    print_info "  - Are in the correct AWS region"
    print_info "  - Have $SERVICE_NAME instances in 'available' state"
    print_info "  - Have the correct AWS profile/credentials configured"
    exit 1
fi

# Display instances for selection
echo "Available $SERVICE_NAME instances:"
echo "$INSTANCES" | nl -w2 -s') '

# Get user selection
echo ""
read -p "Select instance number: " SELECTION

if ! [[ "$SELECTION" =~ ^[0-9]+$ ]]; then
    echo "Error: Please enter a valid number"
    exit 1
fi

# Extract selected instance info
SELECTED_LINE=$(echo "$INSTANCES" | sed -n "${SELECTION}p")
if [ -z "$SELECTED_LINE" ]; then
    echo "Error: Invalid selection"
    exit 1
fi

INSTANCE_ID=$(echo "$SELECTED_LINE" | awk '{print $1}')
INSTANCE_ENDPOINT=$(echo "$SELECTED_LINE" | awk '{print $2}')

echo ""
echo "Selected instance: $INSTANCE_ID"
echo "Endpoint: $INSTANCE_ENDPOINT"
echo ""

# Look for related secrets
echo "Searching for secrets..."

# First try to find secrets with instance ID or service filter
FILTERED_SECRETS=$(aws secretsmanager list-secrets --query "SecretList[?contains(Name, \`${INSTANCE_ID}\`) || contains(Name, \`${SECRET_FILTER}\`)].Name" --output text 2>/dev/null)

SECRET_NAME=""

# Check if fzf is available
if command -v fzf >/dev/null 2>&1; then
    echo "Select a secret (or press ESC to skip):"

    # Get all secrets if no filtered results or offer to search all
    if [ -z "$FILTERED_SECRETS" ]; then
        echo "No secrets found matching filters. Searching all secrets..."
        ALL_SECRETS=$(aws secretsmanager list-secrets --query "SecretList[].Name" --output text 2>/dev/null | tr '\t' '\n')
        SECRET_NAME=$(echo "$ALL_SECRETS" | fzf --prompt="Select secret: " --height=40% --layout=reverse --border)
    else
        # Show filtered secrets first, but allow searching all
        echo "Found $(echo "$FILTERED_SECRETS" | wc -w) matching secret(s). Press TAB to search all secrets."
        FILTERED_LIST=$(echo "$FILTERED_SECRETS" | tr '\t' '\n')

        # Create a combined list with a separator
        SECRET_NAME=$(printf "%s\n---SEARCH ALL SECRETS---\n" "$FILTERED_LIST" | \
            fzf --prompt="Select secret: " --height=40% --layout=reverse --border | \
            grep -v "^---SEARCH ALL SECRETS---$" || true)

        # If user selected the separator, show all secrets
        if [ -z "$SECRET_NAME" ] && [ $? -eq 0 ]; then
            ALL_SECRETS=$(aws secretsmanager list-secrets --query "SecretList[].Name" --output text 2>/dev/null | tr '\t' '\n')
            SECRET_NAME=$(echo "$ALL_SECRETS" | fzf --prompt="Select secret (all): " --height=40% --layout=reverse --border)
        fi
    fi

    if [ -n "$SECRET_NAME" ]; then
        echo "Selected secret: $SECRET_NAME"
    else
        echo "No secret selected"
    fi
else
    # Fallback to original numbered selection if fzf not available
    if [ -n "$FILTERED_SECRETS" ]; then
        echo "Found potential secrets:"
        echo "$FILTERED_SECRETS" | tr '\t' '\n' | nl -w2 -s') '
        echo "$(($(echo "$FILTERED_SECRETS" | wc -w) + 1))) Skip secret selection"
        echo ""
        read -p "Select secret number (or skip): " SECRET_SELECTION

        if [[ "$SECRET_SELECTION" =~ ^[0-9]+$ ]] && [ "$SECRET_SELECTION" -le "$(echo "$FILTERED_SECRETS" | wc -w)" ]; then
            SECRET_NAME=$(echo "$FILTERED_SECRETS" | tr '\t' '\n' | sed -n "${SECRET_SELECTION}p")
            echo "Selected secret: $SECRET_NAME"
        else
            echo "Skipping secret selection"
        fi
    else
        echo "No $SERVICE_NAME secrets found. Install 'fzf' to search all secrets interactively."
        read -p "Do you want to list all secrets? (y/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ALL_SECRETS=$(aws secretsmanager list-secrets --query "SecretList[].Name" --output text 2>/dev/null)
            if [ -n "$ALL_SECRETS" ]; then
                echo "All available secrets:"
                echo "$ALL_SECRETS" | tr '\t' '\n' | nl -w2 -s') '
                echo "$(($(echo "$ALL_SECRETS" | wc -w) + 1))) Skip secret selection"
                echo ""
                read -p "Select secret number (or skip): " SECRET_SELECTION

                if [[ "$SECRET_SELECTION" =~ ^[0-9]+$ ]] && [ "$SECRET_SELECTION" -le "$(echo "$ALL_SECRETS" | wc -w)" ]; then
                    SECRET_NAME=$(echo "$ALL_SECRETS" | tr '\t' '\n' | sed -n "${SECRET_SELECTION}p")
                    echo "Selected secret: $SECRET_NAME"
                else
                    echo "Skipping secret selection"
                fi
            fi
        fi
    fi
fi
echo ""

# Create tunnel pod
TIMESTAMP=$(date +%s)
POD_NAME="${SERVICE_TYPE}-tunnel-${USER_NAME}-${TIMESTAMP}"

echo "Creating tunnel pod: ${POD_NAME}"

cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: ${POD_NAME}
  namespace: tunnels
  labels:
    created-by: ${USER_NAME}
    service: ${SERVICE_TYPE}
    instance: ${INSTANCE_ID}
  annotations:
    tunnel.created-at: "$(date -Iseconds)"
    tunnel.target: "${INSTANCE_ENDPOINT}"
    aws-user: "${RAW_USER}"
    aws-account: "${AWS_ACCOUNT}"
    instance-id: "${INSTANCE_ID}"
    service-type: "${SERVICE_TYPE}"
spec:
  restartPolicy: Never
  containers:
  - name: socat-tunnel
    image: alpine/socat
    args:
    - tcp-listen:${DEFAULT_PORT},fork,reuseaddr
    - tcp-connect:${INSTANCE_ENDPOINT}:${DEFAULT_PORT}
EOF

if [ $? -eq 0 ]; then
    echo "Pod created successfully!"
    echo "Waiting for pod to be ready..."
    kubectl wait --for=condition=Ready pod/${POD_NAME} -n tunnels --timeout=60s

    if [ $? -eq 0 ]; then
        # Find available local port
        LOCAL_PORT=$DEFAULT_PORT
        while netstat -an 2>/dev/null | grep -q ":${LOCAL_PORT} "; do
            LOCAL_PORT=$((LOCAL_PORT + 1))
        done

        echo ""
        echo "=== CONNECTION INFO ==="
        echo "Service: $SERVICE_NAME"
        echo "Instance: $INSTANCE_ID"
        echo "Local port: $LOCAL_PORT"

        # Generate connection commands based on service type
        if [ -n "$SECRET_NAME" ]; then
            echo "Getting credentials from secret: $SECRET_NAME"
            SECRET_VALUE=$(aws secretsmanager get-secret-value --secret-id "$SECRET_NAME" --query SecretString --output text 2>/dev/null)

            if [ $? -eq 0 ] && [ -n "$SECRET_VALUE" ]; then
                USERNAME=$(echo "$SECRET_VALUE" | jq -r '.username // empty')
                PASSWORD=$(echo "$SECRET_VALUE" | jq -r '.password // empty')
                DATABASE=$(echo "$SECRET_VALUE" | jq -r '.database // .dbname // empty')

                if [ -n "$USERNAME" ]; then
                    echo ""
                    echo "Ready to connect! Copy and paste:"

                    case $SERVICE_TYPE in
                        "documentdb")
                            if [ -n "$DATABASE" ]; then
                                echo "mongosh \"mongodb://localhost:${LOCAL_PORT}/${DATABASE}?retryWrites=false&authMechanism=SCRAM-SHA-1\" --username ${USERNAME} --password \"\$(aws secretsmanager get-secret-value --secret-id '${SECRET_NAME}' --query SecretString --output text | jq -r '.password')\""
                            else
                                echo "mongosh \"mongodb://localhost:${LOCAL_PORT}?retryWrites=false&authMechanism=SCRAM-SHA-1\" --username ${USERNAME} --password \"\$(aws secretsmanager get-secret-value --secret-id '${SECRET_NAME}' --query SecretString --output text | jq -r '.password')\""
                            fi
                            ;;
                        "rds-postgres")
                            echo "psql \"postgresql://${USERNAME}:\$(aws secretsmanager get-secret-value --secret-id '${SECRET_NAME}' --query SecretString --output text | jq -r '.password')@localhost:${LOCAL_PORT}/${DATABASE:-postgres}\""
                            ;;
                        "rds-mysql")
                            echo "mysql -h localhost -P ${LOCAL_PORT} -u ${USERNAME} -p\"\$(aws secretsmanager get-secret-value --secret-id '${SECRET_NAME}' --query SecretString --output text | jq -r '.password')\" ${DATABASE}"
                            ;;
                        "elasticache-redis"|"elasticache-valkey")
                            echo "redis-cli -h localhost -p ${LOCAL_PORT}"
                            if [ -n "$PASSWORD" ]; then
                                echo "Then run: AUTH \"\$(aws secretsmanager get-secret-value --secret-id '${SECRET_NAME}' --query SecretString --output text | jq -r '.password // .auth_token')\""
                            fi
                            ;;
                    esac
                else
                    show_manual_connection
                fi
            else
                show_manual_connection
            fi
        else
            show_manual_connection
        fi

        echo ""
        echo "=== CLEANUP ==="
        echo "Delete this tunnel:"
        echo "kubectl delete pod ${POD_NAME} -n tunnels"
        echo ""
        echo "Delete all your tunnels:"
        echo "kubectl delete pods -n tunnels -l created-by=${USER_NAME}"
        echo ""
        echo "Press Ctrl+C to stop port forwarding"
        echo ""

        # Set up cleanup prompt on exit
        cleanup() {
            echo ""
            echo "Port forwarding stopped."
            read -p "Delete tunnel pod ${POD_NAME}? (Y/n): " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Nn]$ ]]; then
                echo "Tunnel pod kept running"
                echo "Delete later with: kubectl delete pod ${POD_NAME} -n tunnels"
            else
                kubectl delete pod ${POD_NAME} -n tunnels
                echo "Tunnel pod deleted"
            fi
        }

        # Set trap for cleanup on script exit
        trap cleanup EXIT

        # Start port forwarding
        kubectl port-forward -n tunnels ${POD_NAME} ${LOCAL_PORT}:${DEFAULT_PORT}
    else
        echo "Pod failed to become ready. Check with:"
        echo "kubectl describe pod ${POD_NAME} -n tunnels"
        echo "kubectl logs ${POD_NAME} -n tunnels"
    fi
else
    echo "Failed to create pod"
fi

# Function to show manual connection examples
show_manual_connection() {
    echo ""
    echo "Manual connection examples:"
    case $SERVICE_TYPE in
        "documentdb")
            echo "mongosh \"mongodb://localhost:${LOCAL_PORT}?retryWrites=false&authMechanism=SCRAM-SHA-1\" --username <username> --password <password>"
            ;;
        "rds-postgres")
            echo "psql \"postgresql://<username>:<password>@localhost:${LOCAL_PORT}/<database>\""
            ;;
        "rds-mysql")
            echo "mysql -h localhost -P ${LOCAL_PORT} -u <username> -p<password> <database>"
            ;;
        "elasticache-redis"|"elasticache-valkey")
            echo "redis-cli -h localhost -p ${LOCAL_PORT}"
            echo "Then run: AUTH <password>  # if authentication is enabled"
            ;;
    esac
}
```

Remember: with great power comes great opportunity to accidentally expose your production database to the internet. Stay safe out there kids! 🚀
