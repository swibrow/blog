+++
author = "Samuel Wibrow"
title = "Replicating AWS IRSA Workflow for my Homelab with Talos and a Raspberry Pi"
date = "2024-06-09"
description = "Dumping access keys for oidc! 😎"
tags = ["aws","oidc","kubernetes","talos"]
draft = false
showMetadata = false
+++

To setup AWS IRSA (IAM Roles for Service Accounts) in your homelab Kubernetes cluster, I used a Raspberry Pi 4 and Talos. IRSA leverages OpenID Connect to authenticate service accounts, providing a secure and convenient method to access AWS resources. This approach simplifies the management of credentials in your Kubernetes environment. Here’s a hacky guide on how I accomplished this setup.

For my testing I grabbed a spare Raspberry Pi 4 4GB and loaded up an SD card with the latest version of talos. This could have easily been done with docker on my mac but I wanted to do a real test so I can migrate the config over to my [homelab](https://github.com/swibrow/pitower) cluster.

Word of warning, I ran through these steps once so mostly likely there's quite some errors. I'll update this post as I refine the process.

You can find all the files referenced in [Github](https://github.com/swibrow/aws-pod-identity-webhook)


### Booting Talos on Raspberry Pi

1. **Download and Prepare the Talos Image:** [https://factory.talos.dev/](https://factory.talos.dev/)
  Talos provides a straightforward process for installation. Here's how to prepare the image on MacOS.

  ```shell
  diskutil list
  # Identify the external drive, in my case /dev/disk2
  diskutil unmount /dev/disk2
  curl -LO https://factory.talos.dev/image/ee21ef4a5ef808a9b7484cc0dda0f25075021691c8c09a276591eedb638ea1f9/v1.7.4/metal-arm64.raw.xz
  xz -d metal-arm64.raw.xz
  sudo dd if=metal-arm64.raw of=/dev/disk2 conv=fsync bs=4M
  ```

2. **Boot and Configure Talos:**
  Insert the SD card and boot the Raspberry Pi. After assigning a static IP via DHCP (mine is `192.168.0.191`), it’s ready for configuration.


### Creating the Talos Cluster

1. **Generate Cluster Configuration:**
  Create a `controlplane.patch` file to set custom kube-apiserver settings, using a GitHub repo as the OIDC Provider server.

  controlplane.patch
  ```yaml
    cluster:
      apiServer:
        extraArgs:
          service-account-issuer: https://raw.githubusercontent.com/<github_org>/<repo>/<branch>/<path>
          service-account-jwks-uri: https://<node_ip>:6443/openid/v1/jwks
      allowSchedulingOnControlPlanes: true
  ```
  machine.patch
  ```yaml
  machine:
    network:
      hostname: master-01
  ```

2. **Generate and Apply Machine Config:**

  ```shell
  talosctl gen config sitower https://192.168.0.191:6443 --config-patch-control-plane @./controlplane.patch --output ./clusterconfig
  cd clusterconfig
  talosctl machineconfig patch ./controlplane.yaml --patch @../machine.patch --output ./master-01.yaml
  talosctl apply-config --insecure --nodes 192.168.0.191 --file ./master-01.yaml
  talosctl --talosconfig ./talosconfig config endpoint 192.168.0.191
  talosctl --talosconfig ./talosconfig bootstrap --nodes 192.168.0.191
  talosctl --talosconfig ./talosconfig kubeconfig --nodes 192.168.0.191
  ```

   Verify the setup:

  ```shell
  kubectl get pods -A

  NAMESPACE     NAME                                READY   STATUS    RESTARTS       AGE
  kube-system   coredns-64b67fc8fd-j6hnb            1/1     Running   0              88s
  kube-system   coredns-64b67fc8fd-nj8hw            1/1     Running   0              88s
  kube-system   kube-apiserver-master-01            1/1     Running   0              9s
  kube-system   kube-controller-manager-master-01   1/1     Running   2 (2m2s ago)   32s
  kube-system   kube-flannel-rqrn2                  1/1     Running   0              87s
  kube-system   kube-proxy-4llwx                    1/1     Running   0              87s
  kube-system   kube-scheduler-master-01            1/1     Running   2 (2m4s ago)   25s
  ```


### Setting Up OIDC Provider

1. **Export and Modify OIDC Configuration:**
  Export the OIDC configuration from the cluster and store it in your GitHub repository.

  ```shell
  kubectl get --raw /.well-known/openid-configuration | jq > .well-known/openid-configuration
  kubectl get --raw /openid/v1/jwks | jq > .well-known/jwks
  ```

  Replace the `issuer` and `jwks_uri` fields appropriately in the `openid-configuration` file.

  ```json
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
  ```

2. **Deploy Cert-Manager and AWS Pod Identity Webhook:**

	Deploy Cert manager to make use of the cainjector.

  ```shell
  kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.15.0/cert-manager.yaml
  ```

  Create the following files

  kustomization.yaml
  ```yaml
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
  ```

  naemspace.yaml
  ```yaml
  apiVersion: v1
  kind: Namespace
  metadata:
    name: aws-identity-webhook
  ```

  values.yaml
  ```yaml
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
  ```


### Creating IAM Roles with Terraform

1. **Define OIDC Provider and IAM Role:**

  ```terraform
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
              "${aws_iam_openid_connect_provider.kubernetes_oidc_staging.arn}"
            ]
          },
          "Action" : "sts:AssumeRoleWithWebIdentity",
          "Condition" : {
            "StringEquals" : {
              "${aws_iam_openid_connect_provider.kubernetes_oidc_staging.url}:sub" : "system:serviceaccount:test:pitower-test",
              "${aws_iam_openid_connect_provider.kubernetes_oidc_staging.url}:aud" : "sts.amazonaws.com"
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
  ```

### Testing the Setup

1. **Deploy AWS CLI Test Pod:**

  ```yaml
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
      eks.amazonaws.com/role-arn: arn:aws:iam::633355703129:role/pitower-test
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
  ```

  Confirm successful authentication and access

  ```shell
  kubectl get pods -n test
  kubectl logs pitower-test-<pod-id> -n test
  ```

  The logs should show your S3 buckets, indicating that the IRSA setup is working correctly.


  🚀

  ```shell
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
  ```

### Conclusion

Now I can authenticate any pod running in my homelabs to AWS using the IRSA method.

I will refine the setup before adding support into my public homelab cluster [pitower](https://github.com/swibrow/pitower)

Feel free to reach out if you have any questions or need help with the setup. [linkedin](https://www.linkedin.com/in/samuelwibrow/) or any of the main CNCF/Kubernetes slack channels, [home operations discord](https://discord.com/invite/home-operations), you wont find another Wibrow kicking around.

### References
- [AWS Pod Identity Webhook](https://github.com/aws/amazon-eks-pod-identity-webhook)
- [Sidero Labs: Workload Identity for Kubernetes on GCP](https://www.siderolabs.com/blog/workload-identity-for-kubernetes-on-gcp/)
- [Talos Installation Guide for Raspberry Pi](https://www.talos.dev/v1.7/talos-guides/install/single-board-computers/rpi_generic/)
- [Helm Charts for Amazon EKS Pod Identity Webhook](https://github.com/jkroepke/helm-charts/tree/main/charts/amazon-eks-pod-identity-webhook)

