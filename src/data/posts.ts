export interface Post {
  slug: string;
  title: string;
  date: string;
  description: string;
  author: string;
  tags: string[];
  content: string;
}

const allPosts: (Post & { draft?: boolean })[] = [
  {
    slug: "aws-oidc-pod-identity",
    title:
      "Replicating AWS IRSA Workflow for my Homelab with Talos and a Raspberry Pi",
    date: "2024-06-09",
    description: "Dumping access keys for oidc!",
    author: "Samuel Wibrow",
    tags: ["aws", "oidc", "kubernetes", "talos"],
    content: `IRSA leverages OpenID Connect to authenticate service accounts, providing a secure and convenient method to access AWS resources. This approach simplifies the management of credentials in your Kubernetes environment.

To test AWS IRSA (IAM Roles for Service Accounts) in a selfhosted Kubernetes cluster, I used a spare Raspberry Pi 4 and [Talos](https://www.talos.dev/) (Kubernetes Operating System). This could have easily been done with docker on my mac but I wanted to do a real test so I can migrate the config over to my [homelab](https://github.com/swibrow/pitower) cluster.

Word of warning, I only ran through these steps once so most likely there's quite some errors. I'll update this post as I refine the process.

You can find all the referenced files [here](https://github.com/swibrow/aws-pod-identity-webhook)


### Booting Talos on Raspberry Pi

1. **Download and Prepare the Talos Image:** [https://factory.talos.dev/](https://factory.talos.dev/)
  Talos provides a straightforward process for installation. Here's how to prepare the image on MacOS.

  \`\`\`shell
  diskutil list
  # Identify the external drive, in my case /dev/disk2
  diskutil unmount /dev/disk2
  curl -LO https://factory.talos.dev/image/ee21ef4a5ef808a9b7484cc0dda0f25075021691c8c09a276591eedb638ea1f9/v1.7.4/metal-arm64.raw.xz
  xz -d metal-arm64.raw.xz
  sudo dd if=metal-arm64.raw of=/dev/disk2 conv=fsync bs=4M
  \`\`\`

2. **Boot and Configure Talos:**
  Insert the SD card and boot the Raspberry Pi. After assigning a static IP via DHCP (mine is \`192.168.0.191\`), it's ready for configuration.


### Creating the Talos Cluster

1. **Generate Cluster Configuration:**

  Create a \`controlplane.patch\` file to set custom kube-apiserver settings, using a GitHub repo as the OIDC Provider server.

  controlplane.patch
  \`\`\`yaml
    cluster:
      apiServer:
        extraArgs:
          service-account-issuer: https://raw.githubusercontent.com/<github_org>/<repo>/<branch>/<path>
          service-account-jwks-uri: https://<node_ip>:6443/openid/v1/jwks
      allowSchedulingOnControlPlanes: true
  \`\`\`

  Create a \`machine.patch\` file to set a pet name for the server.

  machine.patch
  \`\`\`yaml
  machine:
    network:
      hostname: master-01
  \`\`\`

2. **Generate and Apply Machine Config:**

  \`\`\`shell
  talosctl gen config sitower https://192.168.0.191:6443 --config-patch-control-plane @./controlplane.patch --output ./clusterconfig
  cd clusterconfig
  talosctl machineconfig patch ./controlplane.yaml --patch @../machine.patch --output ./master-01.yaml
  talosctl apply-config --insecure --nodes 192.168.0.191 --file ./master-01.yaml
  talosctl --talosconfig ./talosconfig config endpoint 192.168.0.191
  talosctl --talosconfig ./talosconfig bootstrap --nodes 192.168.0.191
  talosctl --talosconfig ./talosconfig kubeconfig --nodes 192.168.0.191
  \`\`\`

   Verify the setup:

  \`\`\`shell
  kubectl get pods -A

  NAMESPACE     NAME                                READY   STATUS    RESTARTS       AGE
  kube-system   coredns-64b67fc8fd-j6hnb            1/1     Running   0              88s
  kube-system   coredns-64b67fc8fd-nj8hw            1/1     Running   0              88s
  kube-system   kube-apiserver-master-01            1/1     Running   0              9s
  kube-system   kube-controller-manager-master-01   1/1     Running   2 (2m2s ago)   32s
  kube-system   kube-flannel-rqrn2                  1/1     Running   0              87s
  kube-system   kube-proxy-4llwx                    1/1     Running   0              87s
  kube-system   kube-scheduler-master-01            1/1     Running   2 (2m4s ago)   25s
  \`\`\`


### Setting Up OIDC Provider

1. **Export and Modify OIDC Configuration:**
  Export the OIDC configuration from the cluster and store it in your GitHub repository.

  \`\`\`shell
  kubectl get --raw /.well-known/openid-configuration | jq > .well-known/openid-configuration
  kubectl get --raw /openid/v1/jwks | jq > .well-known/jwks
  \`\`\`

  Replace the \`issuer\` and \`jwks_uri\` fields appropriately in the \`openid-configuration\` file.

  \`\`\`json
  {
    "issuer": "https://raw.githubusercontent.com/swibrow/aws-pod-identity-webhoo/main",
    "jwks_uri": "https://raw.githubusercontent.com/swibrow/aws-pod-identity-webhook/main/.well-known/jwks",
    "response_types_supported": [
      "id_token"
    ],
    "subject_types_supported": [
      "public"
    ],
    "id_token_signing_alg_values_supported": [
      "RS256"
    ]
  }
  \`\`\`

2. **Deploy Cert-Manager and AWS Pod Identity Webhook:**

	Deploy Cert manager to make use of the cainjector.

  \`\`\`shell
  kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.15.0/cert-manager.yaml
  \`\`\`

  Create the following files

  kustomization.yaml
  \`\`\`yaml
  apiVersion: kustomize.config.k8s.io/v1beta1
  kind: Kustomization
  resources:
    - namespace.yaml
  helmCharts:
    - name: amazon-eks-pod-identity-webhook
      repo: https://jkroepke.github.io/helm-charts
      version: 2.1.3
      releaseName: aws-identity-webhook
      namespace: aws-identity-webhook
      valuesFile: values.yaml
  \`\`\`

  naemspace.yaml
  \`\`\`yaml
  apiVersion: v1
  kind: Namespace
  metadata:
    name: aws-identity-webhook
  \`\`\`

  values.yaml
  \`\`\`yaml
  image:
    tag: v0.5.4
  config:
    annotationPrefix: eks.amazonaws.com
    defaultAwsRegion: ""
    stsRegionalEndpoint: false
  pki:
    certManager:
      enabled: true
  securityContext:
    runAsNonRoot: true
    runAsUser: 65534
    runAsGroup: 65534
    allowPrivilegeEscalation: false
    readOnlyRootFilesystem: true
    capabilities:
      drop: ["ALL"]
    seccompProfile:
      type: RuntimeDefault
  \`\`\`


### Creating IAM Roles with Terraform

1. **Define OIDC Provider and IAM Role:**

  \`\`\`terraform
  data "tls_certificate" "kubernetes_oidc_staging" {
    url = "https://raw.githubusercontent.com/swibrow/aws-pod-identity-webhook/main"
  }

  resource "aws_iam_openid_connect_provider" "kubernetes_oidc_staging" {
    url = "https://raw.githubusercontent.com/swibrow/aws-pod-identity-webhook/main"
    client_id_list = ["sts.amazonaws.com"]
    thumbprint_list = [data.tls_certificate.kubernetes_oidc_staging.certificates[0].sha1_fingerprint]
  }

  resource "aws_iam_role" "pitower_test" {
    name = "pitower-test"
    assume_role_policy = jsonencode({
      "Version" : "2012-10-17",
      "Statement" : [
        {
          "Effect" : "Allow",
          "Principal" : {
            "Federated" : [
              "\${aws_iam_openid_connect_provider.kubernetes_oidc_staging.arn}"
            ]
          },
          "Action" : "sts:AssumeRoleWithWebIdentity",
          "Condition" : {
            "StringEquals" : {
              "\${aws_iam_openid_connect_provider.kubernetes_oidc_staging.url}:sub" : "system:serviceaccount:test:pitower-test",
              "\${aws_iam_openid_connect_provider.kubernetes_oidc_staging.url}:aud" : "sts.amazonaws.com"
            }
          }
        }
      ]
    })
  }

  resource "aws_iam_role_policy_attachment" "pitower_test" {
    role = aws_iam_role.pitower_test.name
    policy_arn = aws_iam_policy.pitower_test.arn
  }

  resource "aws_iam_policy" "pitower_test" {
    name = "list-buckets"
    policy = jsonencode({
      "Version" : "2012-10-17",
      "Statement" : [
        {
          "Action" : "s3:ListAllMyBuckets",
          "Effect" : "Allow",
          "Resource" : "*"
        }
      ]
    })
  }
  \`\`\`

### Testing the Setup

1. **Deploy AWS CLI Test Pod:**

  \`\`\`yaml
  apiVersion: v1
  kind: Namespace
  metadata:
    name: test
  ---
  apiVersion: v1
  kind: ServiceAccount
  metadata:
    name: pitower-test
    namespace: test
    annotations:
      eks.amazonaws.com/role-arn: arn:aws:iam::1111111111111:role/pitower-test
  ---
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: pitower-test
    namespace: test
  spec:
    selector:
      matchLabels:
        app: pitower-test
    template:
      metadata:
        labels:
          app: pitower-test
      spec:
        serviceAccountName: pitower-test
        containers:
          - name: pitower-test
            image: amazon/aws-cli
            command: ["aws", "s3api", "list-buckets", "--no-cli-pager"]
            securityContext:
              runAsNonRoot: true
              runAsUser: 65534
              runAsGroup: 65534
              allowPrivilegeEscalation: false
              readOnlyRootFilesystem: true
              capabilities:
                drop: ["ALL"]
              seccompProfile:
                type: RuntimeDefault
            volumeMounts:
              - name: aws
                mountPath: /.aws
                readOnly: false
        volumes:
          - name: aws
            emptyDir: {}
  \`\`\`

  Confirm successful authentication and access

  \`\`\`shell
  kubectl get pods -n test
  kubectl logs pitower-test-<pod-id> -n test
  \`\`\`

  The logs should show your S3 buckets, indicating that the IRSA setup is working correctly.


  \`\`\`shell
  pitower-test-58d6d5f8bf-mdpg5
  [pitower-test-58d6d5f8bf-mdpg5] {
  [pitower-test-58d6d5f8bf-mdpg5]     "Buckets": [
  [pitower-test-58d6d5f8bf-mdpg5]         {
  [pitower-test-58d6d5f8bf-mdpg5]             "Name": "wibrow.net",
  [pitower-test-58d6d5f8bf-mdpg5]             "CreationDate": "2023-02-28T06:07:00+00:00"
  [pitower-test-58d6d5f8bf-mdpg5]         }
  [pitower-test-58d6d5f8bf-mdpg5]     ],
  [pitower-test-58d6d5f8bf-mdpg5]     "Owner": {
  [pitower-test-58d6d5f8bf-mdpg5]         "DisplayName": "sam.wibrow",
  [pitower-test-58d6d5f8bf-mdpg5]         "ID": "a21d7bb1a598ed1f67ebcea6370c14dbdc39060a1e718d6be16e011faaf22f7e"
  [pitower-test-58d6d5f8bf-mdpg5]     }
  [pitower-test-58d6d5f8bf-mdpg5] }
  \`\`\`

### Conclusion

Now I can authenticate any pod running in my homelabs to AWS using the IRSA method.

I will refine the setup before adding support into my public homelab cluster [pitower](https://github.com/swibrow/pitower)

Feel free to reach out if you have any questions or need help with the setup. [linkedin](https://www.linkedin.com/in/samuelwibrow/) or any of the main CNCF/Kubernetes slack channels, [home operations discord](https://discord.com/invite/home-operations), you wont find another Wibrow kicking around.

### References
- [AWS Pod Identity Webhook](https://github.com/aws/amazon-eks-pod-identity-webhook)
- [Sidero Labs: Workload Identity for Kubernetes on GCP](https://www.siderolabs.com/blog/workload-identity-for-kubernetes-on-gcp/)
- [Talos Installation Guide for Raspberry Pi](https://www.talos.dev/v1.7/talos-guides/install/single-board-computers/rpi_generic/)
- [Helm Charts for Amazon EKS Pod Identity Webhook](https://github.com/jkroepke/helm-charts/tree/main/charts/amazon-eks-pod-identity-webhook)`,
  },
  {
    slug: "aws-proxy-kube-socat",
    title:
      "Building a Hacky AWS Proxy Service with kube-proxy, socat, and Bash",
    date: "2025-08-15",
    description:
      "A simple solution for tunneling AWS services through Kubernetes using bash, socat, and port forwarding",
    author: "Samuel Wibrow",
    tags: ["AWS", "Kubernetes", "Bash", "Proxy", "DevOps"],
    content: `*Disclaimer: My good friend Claude wrote this post. I only created a hack and told him about it.*

Ever needed to connect to AWS services like RDS or DocumentDB from your local machine, but they're locked away in private subnets? Instead of doing something reasonable like setting up a VPN, here's a solution that involves using your production Kubernetes cluster as an impromptu bastion host. What could possibly go wrong?

## The Problem

AWS best practices dictate that databases and other sensitive services should live in private subnets, inaccessible from the public internet. While this is great for security, it makes local development a pain. Traditional solutions involve:

- VPN connections (Thats no fun)
- Bastion hosts (We already have ec2 running)
- SSH tunnels (thats so 1990s)

What if we could use our existing Kubernetes cluster as a gateway?

## The Hacky Solution

The core idea is simple and asking for trouble: deploy a temporary pod in your Kubernetes cluster that can reach AWS services, then use \`kubectl port-forward\` to tunnel the connection to your local machine. Here's how it works:

### Architecture Overview

\`\`\`
Local Machine → kubectl port-forward → K8s Pod (socat) → AWS Service
\`\`\`

The magic happens in three parts:

1. **Kubernetes endpoint** (must be public) - Your cluster's API server
2. **Proxy pod** - A lightweight container running socat
3. **Local port forwarding** - kubectl handles the tunnel

### Prerequisites: The Security Nightmare

Before we dive into the code, let's talk about what you need to make this work. Spoiler alert: it requires a security posture that would make your CISO wake up in cold sweats.

You'll need:
- A Kubernetes cluster where you can create pods (preferably in a namespace where important things live)
- AWS credentials with permissions to list and connect to your databases
- \`kubectl\` access from your local machine to production (what could go wrong?)
- The ability to run random Alpine containers that open network sockets

If your security team is reading this, maybe stop here and pretend you never saw it.

### The Bash Implementation

Here's where it gets interesting. Instead of hardcoding endpoints like a barbarian, let's use AWS CLI to discover services dynamically:

\`\`\`bash
#!/bin/bash

# AWS Service Discovery with fzf magic
discover_rds_instances() {
    aws rds describe-db-instances \\
        --query 'DBInstances[*].[DBInstanceIdentifier,Endpoint.Address,Endpoint.Port,Engine]' \\
        --output text | column -t
}

discover_documentdb_clusters() {
    aws docdb describe-db-clusters \\
        --query 'DBClusters[*].[DBClusterIdentifier,Endpoint,Port]' \\
        --output text | column -t
}

discover_elasticache_clusters() {
    aws elasticache describe-cache-clusters \\
        --query 'CacheClusters[*].[CacheClusterId,ConfigurationEndpoint.Address,ConfigurationEndpoint.Port,Engine]' \\
        --output text | column -t
}

# Interactive selection with fzf (because we're fancy like that)
select_service() {
    echo "What are we tunneling to today?"
    SERVICE_TYPE=$(echo -e "RDS\\nDocumentDB\\nElastiCache" | fzf --prompt="Service Type: ")

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
    local local_port=\${3:-$port}

    # Generate pod name with timestamp (for concurrent tunnels)
    POD_NAME="tunnel-$(echo $endpoint | cut -d. -f1)-$(date +%s)"

    echo "Creating tunnel pod: $POD_NAME"

    # Create the socat relay pod
    kubectl run $POD_NAME \\
        --image=alpine/socat:latest \\
        --restart=Never \\
        --command -- \\
        socat -d -d \\
        TCP-LISTEN:$port,fork,reuseaddr \\
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
\`\`\`

### AWS Authentication

The nice part is handling AWS authentication. The script leverages several authentication methods:

1. **IAM Roles for Service Accounts (IRSA)** - If your cluster uses IRSA, the pod automatically inherits permissions
2. **AWS Secrets Manager** - Store database credentials securely and retrieve them at runtime
3. **Environment variables** - Pass AWS credentials to the pod (less secure, but works)

Here's how to handle credential retrieval:

\`\`\`bash
# Retrieve credentials from AWS Secrets Manager
get_db_credentials() {
    local secret_name=$1

    # Use AWS CLI to fetch secrets
    SECRET_JSON=$(aws secretsmanager get-secret-value \\
        --secret-id $secret_name \\
        --query SecretString \\
        --output text)

    # Parse credentials
    DB_HOST=$(echo $SECRET_JSON | jq -r '.host')
    DB_PORT=$(echo $SECRET_JSON | jq -r '.port')
    DB_USER=$(echo $SECRET_JSON | jq -r '.username')
    DB_PASS=$(echo $SECRET_JSON | jq -r '.password')
}
\`\`\`

### Making it Production-Ready(ish)

The full implementation includes several enhancements that make it almost responsible:

\`\`\`bash
# Enhanced service discovery with filtering
discover_services_with_tags() {
    local tag_filter=$1

    # Find RDS instances by tag
    aws rds describe-db-instances \\
        --query "DBInstances[?Tags[?Key=='Environment' && Value=='$tag_filter']].[DBInstanceIdentifier,Endpoint.Address,Endpoint.Port]" \\
        --output text
}

# Multi-region support (because why limit the chaos?)
discover_all_regions() {
    aws ec2 describe-regions --query 'Regions[*].RegionName' --output text | tr '\\t' '\\n' | \\
    while read region; do
        echo "=== Region: $region ==="
        AWS_REGION=$region discover_rds_instances
    done
}

# Concurrent tunnel management
manage_tunnels() {
    # List active tunnels
    list_tunnels() {
        kubectl get pods -l app=db-tunnel -o json | \\
        jq -r '.items[] | "\\(.metadata.name)\\t\\(.metadata.labels.service)\\t\\(.metadata.creationTimestamp)"' | \\
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
            echo "Connection successful"
            return 0
        fi
        echo "Retrying... ($retries attempts left)"
        ((retries--))
        sleep 2
    done

    echo "Connection failed"
    return 1
}

# Advanced fzf integration
advanced_selection() {
    # Multi-select with preview
    aws rds describe-db-instances --output json | \\
    jq -r '.DBInstances[] | [.DBInstanceIdentifier, .Engine, .DBInstanceStatus, .Endpoint.Address] | @tsv' | \\
    fzf --multi \\
        --preview 'aws rds describe-db-instances --db-instance-identifier {1} --output json | jq .' \\
        --preview-window right:50% \\
        --header "Select databases (TAB for multi-select)"
}
\`\`\`

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

\`\`\`go
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
\`\`\`

### 2. Dedicated Proxy Server

Instead of socat, build a purpose-built proxy server:

\`\`\`go
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
\`\`\`

This would enable:
- Multiple simultaneous connections
- Protocol-aware proxying (SQL query logging, etc.)
- Built-in authentication handling
- Metrics and monitoring

### 3. TTL on Proxy Containers

Implement automatic cleanup with TTLs:

\`\`\`yaml
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
\`\`\`

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

\`\`\`bash
# The full experience with fzf selection
aws rds describe-db-instances --output json | \\
jq -r '.DBInstances[] | "\\(.DBInstanceIdentifier)|\\(.Endpoint.Address):\\(.Endpoint.Port)"' | \\
fzf --delimiter='|' --preview 'echo "Connecting to: {2}"' | \\
awk -F'|' '{print $2}' | \\
xargs -I {} sh -c 'kubectl run tunnel-$RANDOM --image=alpine/socat --restart=Never -- socat TCP-LISTEN:5432,fork,reuseaddr TCP:{} && kubectl port-forward pod/tunnel-$RANDOM 5432:5432'
\`\`\`

Remember: with great power comes great opportunity to accidentally expose your production database to the internet. Stay safe out there kids!`,
  },
  {
    slug: "chatgpt",
    title: "Sunday afternoon with chatGPT",
    date: "2023-04-12",
    description: "A brief interaction with OpenAi's LLM",
    author: "Samuel Wibrow",
    tags: ["chatgpt", "ai"],
    content: `***Cheesy post that was generated by chatGPT***

Hello everyone! Today, I want to share my intriguing journey of adapting a pre-made Python tutorial on building a URL shortener to use DynamoDB for its backend, and how I successfully crafted a unique, user-friendly frontend with the help of ChatGPT.

![API](/images/posts/chatgpt/api.png)

As someone who has always been captivated by the simplicity and usefulness of URL shorteners, I wanted to create my own but with a personal touch. I knew that in order to achieve a functional, secure, and scalable URL shortener, I would need a strong backend, an engaging frontend, and an efficient infrastructure.

I started by finding a Python tutorial that provided a great starting point for building a URL shortener. However, I wanted to go beyond the tutorial's original design and utilize DynamoDB as my database, as it would scale well and deliver outstanding performance. With that in mind, I redesigned the backend to work seamlessly with DynamoDB, creating a simple schema for my table and implementing CRUD operations to interact with the database.

Once the backend was ready, it was time to work on the frontend. To make it truly unique and user-friendly, I turned to ChatGPT for guidance. With ChatGPT's assistance, I created a visually appealing and functional UI using Angular. The frontend allowed users to easily shorten URLs, manage their existing links, and view analytics. ChatGPT even helped me add features like dark mode, a QR code generator, and clipboard functionality for a more streamlined user experience.

![UI](/images/posts/chatgpt/ui.png)

To deploy my application, I opted for AWS Lambda, which provided a cost-effective and highly scalable solution. I used Terraform to automate the deployment process, creating a module that deployed both the DynamoDB table and the Lambda function. I also set up API Gateway to handle incoming requests and created an S3 bucket to host my frontend.

Throughout the development process, I encountered a few challenges, such as CORS-related issues and permission errors. Thankfully, ChatGPT was there to help me troubleshoot and overcome these obstacles, ensuring a smooth development experience.

I wanted to make my URL shortener even more accessible and professional, so I decided to add custom domain support. With ChatGPT's guidance, I used Route 53 to configure the custom domain and created a CloudFront distribution to serve my frontend through a Content Delivery Network (CDN), ensuring fast load times for users around the world.

Looking back, I am thrilled with the end product--a robust, secure, and scalable URL shortener that not only meets but exceeds my initial expectations. Throughout this journey, I learned a great deal about web development, infrastructure, and problem-solving, and I am excited to share my unique creation with the world.

Thank you for joining me on this adventure, and I hope my story inspires you to embark on your own web development journey and make use of amazing tools like ChatGPT!

In the upcoming post, we will discuss the series of prompts utilized to achieve the final outcome. This step-by-step walkthrough will provide insight into the process and illustrate how we arrived at the completed project. Stay tuned to learn more about the various prompts and the logic behind them.`,
  },
  {
    slug: "how",
    title: "how - Natural Language to Shell Commands",
    date: "2026-02-18",
    description:
      "A CLI tool that turns plain English into shell commands, powered by LLMs running locally with Ollama",
    author: "Samuel Wibrow",
    tags: ["go", "cli", "ai", "ollama", "llm"],
    content: `You know *what* you want to do in the terminal, but can't remember the exact flags. Was it \`find -mtime\` or \`find -mmin\`? Does \`tar\` need \`-xvf\` or \`-xzf\`? You Google it, wade through Stack Overflow circa 2012, and eventually find the answer buried under AI-generated SEO spam.

**[how](https://github.com/swibrow/how)** fixes that. It's a Go CLI that turns plain English into shell commands.

\`\`\`bash
$ how find all go files modified in the last 24 hours

  find . -name '*.go' -mtime -1

  Finds all files ending in .go that were modified within the last day.
\`\`\`

No fluff. No ads. No cookie banners. Just the command and a short explanation.

---

## Running it locally with Ollama

The tool supports Anthropic, OpenAI, and Ollama as backends. I use **[Ollama](https://ollama.com/)** for local inference - no API keys, no network calls, no usage costs. Just a model running on my machine. Everything stays private and it works offline, which is handy on a plane or in an environment where you'd rather not send queries to external APIs.

---

## Setup

Install with Go or grab a binary from the [releases page](https://github.com/swibrow/how/releases):

\`\`\`bash
go install github.com/swibrow/how@latest
\`\`\`

Then initialise the config:

\`\`\`bash
how config init
\`\`\`

This creates \`~/.config/how/config.yaml\`. Point it at Ollama:

\`\`\`yaml
provider: ollama
ollama:
  model: llama3
  url: http://localhost:11434
\`\`\`

That's it. No API key required - just make sure Ollama is running.

---

## Usage

Basic query:

\`\`\`bash
how reverse a string in bash
\`\`\`

Auto-execute the returned command with \`-y\`:

\`\`\`bash
how -y list listening ports
\`\`\`

Pipe directly into your shell with \`-q\` (quiet mode):

\`\`\`bash
how -q convert png to jpg with imagemagick | sh
\`\`\`

---

## Examples

---

The code is on GitHub: **[github.com/swibrow/how](https://github.com/swibrow/how)** - MIT licensed, written in Go, contributions welcome.`,
  },
  {
    slug: "sofle-split-keyboard",
    title: "Trying a 66-Key Sofle Split Keyboard",
    date: "2025-09-10",
    description: "",
    author: "Samuel Wibrow",
    tags: ["keyboards", "mechanical-keyboards", "ergonomics", "diy"],
    content: `## The Journey to Split Keyboards
I've been using mechanical keyboards for years, but always stuck with traditional 80% layouts. My first attempt at going split was with a Corne keyboard, but it failed after just a few weeks. However, the appeal of better ergonomics and reduced strain during long coding sessions kept drawing me back to split keyboards. Plus, there's something oddly satisfying about completely relearning how to type--because who doesn't enjoy feeling like a complete beginner again?

## What is the Sofle?

The Sofle is an open-source split keyboard design featuring:
- 66 keys total (33 per half)
- Column-staggered layout for natural finger positioning
- Full QMK/VIA support for customization
- Hot-swappable switches

![sofle](/images/posts/sofle-split-keyboard/sofle.jpg)

## The Build Process

I soldered a corne some years back with my 20 buck soldering iron and it quickly had some issues so I decided to go with a pre-soldered PCB for the Sofle.

### Components
- Sofle v2 PCB (Everything pre-soldered)
- Mechanical switches (I went with Gateron Browns)
- Keycaps (XDA profiles)
- USB 2.4Ghz dongle for wireless connectivity
- USB-C cable for charging

## Layout and Layers

Since this is the 66 key version which gives an extra 8 keys and 6 of them in range of the index finger, I'll see if I can try to have minimal use of layers for normal day to day coding.

## The Learning Curve

Will get back to this after the first week of using it 100%`,
  },
  {
    slug: "tfout",
    title:
      "Building a Kubernetes Operator for the sake of building a Kubernetes Operator",
    date: "2025-05-28",
    description:
      "A simple operator to sync Terraform outputs into Kubernetes ConfigMaps and Secrets",
    author: "Samuel Wibrow",
    tags: ["kubernetes", "operator", "kubebuilder", "claude", "ai"],
    content: `## The Problem

At my current $job, we recently migrated to ArgoCD from Terraform for application deployments. With that came a challenge: **how do we pass Terraform outputs into Kubernetes manifests?**

For example, our AWS Managed Prometheus endpoint lives in Terraform state, but our apps deployed via ArgoCD need that URL. Sure, we could use External Secrets Operator (and we do!), but it adds an extra layer of indirection when you just want to see what values are being injected into pods.

## The Solution: TFOut

After exploring what's hot in 2025 for building Kubernetes operators, I had a dabble with [Metacontroller](https://metacontroller.github.io/metacontroller/intro.html) but ultimately chose [Kubebuilder](https://book.kubebuilder.io/) - the same framework powering projects like Karpenter.

So Claude and I vibed out for the afternoon and built **TFOut** - a simple operator that syncs Terraform state outputs from S3 directly into Kubernetes ConfigMaps and Secrets.

### Quick Example

Here's all you need to sync your Terraform outputs:

\`\`\`yaml
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
\`\`\`

**Result**: All your Terraform outputs are automatically available as ConfigMaps and Secrets in Kubernetes. Sensitive outputs go into Secrets, the rest into ConfigMaps.

## What's in the Box?

Building a production-ready operator in an afternoon? Here's what Claude and I shipped:

### Core Features
- **Operator** - Go + Kubebuilder framework
- **Helm charts** - Easy deployment
- **Documentation** - MkDocs + GitHub Pages
- **CI/CD** - GitHub Actions workflows
- **E2E tests** - Kind-based testing
- **Observability** - Prometheus metrics + Grafana dashboards
- **Security** - Full RBAC setup

## How It Works

The reconciliation loop is beautifully simple:

1. **Watch** - Monitor \`TerraformOutputs\` resources
2. **Fetch** - Pull state from S3 (only if ETag changed)
3. **Parse** - Extract all Terraform outputs
4. **Sync** - Create/update ConfigMaps and Secrets
5. **Merge** - Handle multiple backends gracefully

### Example Output

\`\`\`bash
$ kubectl get configmap my-terraform-outputs -o yaml
data:
  api_endpoint: https://api.example.com
  cdn_domain: cdn.example.com
  database_host: postgres.internal.example.com
\`\`\`

## Development Journey

The process was refreshingly straightforward:

1. **Scaffold** - Kubebuilder did the heavy lifting
2. **Focus** - Wrote the core reconciliation logic
3. **Iterate** - Claude helped with boilerplate (Helm templates, GitHub Actions, tests)
4. **Polish** - Added metrics, multi-backend support, and proper error handling

## Production-Ready Features

### Smart Change Detection
Uses S3 ETags to avoid unnecessary syncs - only fetches when state actually changes.

### Multi-Backend Support
Merge outputs from multiple Terraform states seamlessly:
\`\`\`yaml
backends:
  - s3:
      bucket: prod-state
      key: prod/terraform.tfstate
  - s3:
      bucket: other-state
      key: other/terraform.tfstate
\`\`\`

### Full Observability
- Sync duration metrics
- Error count tracking
- Output count monitoring
- Grafana dashboard included!

### Enterprise Security
- IAM roles for S3 access
- Full RBAC implementation
- Automatic sensitive data detection
- Secure Secret creation

### Comprehensive Testing
- Unit tests with high coverage
- E2E tests using Kind clusters
- Integration tests for S3 operations

## Get Started

### Installation

The code is on GitHub: **[github.com/swibrow/tfout](https://github.com/swibrow/tfout)**

\`\`\`bash
# Add the Helm repository
helm repo add tfout https://swibrow.github.io/tfout
helm repo update

# Install the operator
helm install tfout tfout/tfout \\
  --namespace tfout \\
  --create-namespace
\`\`\`

## AWS Pod Identity Setup

Configure IAM roles for secure S3 access:

\`\`\`hcl
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
\`\`\`

## Complete Example

Here's a full example with multiple backends and custom naming:

\`\`\`yaml
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
\`\`\`

### Using the Outputs in Your Apps

\`\`\`yaml
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
\`\`\`

## Key Takeaways

1. **Kubernetes operators aren't scary** - With modern tooling, you can build production-ready operators quickly
2. **AI accelerates development** - Claude handled the boilerplate while I focused on business logic
3. **Sometimes simple is better** - Not every problem needs a complex solution
4. **The ecosystem has matured** - Tools like Kubebuilder make operator development accessible

## Join the Fun!

If you made it this far, thanks for reading! I hope this inspires you to build that operator you've been thinking about. Your mum will definitely be impressed!

Got questions? Find me on:
- **GitHub**: [github.com/swibrow/tfout](https://github.com/swibrow/tfout)
- **LinkedIn**: [https://www.linkedin.com/in/samuelwibrow/](https://www.linkedin.com/in/samuelwibrow/)`,
  },
];

export const posts: Post[] = allPosts
  .filter((p) => !("draft" in p) || !p.draft)
  .map(({ draft: _, ...post }) => post as Post)
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
