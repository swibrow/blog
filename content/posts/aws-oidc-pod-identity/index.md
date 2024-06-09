+++
author = "Samuel Wibrow"
title = "Sunday afternoon with oidc"
date = "2024-06-09"
description = "Dumping access keys for oidc"
tags = [
    "aws",
    "oidc",
    "kubernetes",
    "talos"
]
draft = false
+++

When running Kubernetes in AWS you utilise IRSA (IAM roles for service accounts) to authenticate workloads using IAM roles. IRSA uses OpenID connect to authenticate service accounts. Since I'm using AWS to host dns zones, secrets etc that my homelab needs to access. I started out with access keys but I wanted to replicate the IRSA workflow in my private clusters.

I did some quick research and came across https://github.com/aws/amazon-eks-pod-identity-webhook and a blog post from [sliderolabs](https://www.siderolabs.com/blog/workload-identity-for-kubernetes-on-gcp/) the creators of [talos](https://www.talos.dev/)

For my testing I grabbed a spare Raspberry Pi 4 4GB and loaded up an SD card with the latest version of talos. This could have easily been done with docker on my mac but I wanted to do a real test so I can migrate the config over to my [homelab](https://github.com/swibrow/pitower) cluster.

Steps:
- Boot talos on raspberry pi
- Create talos cluster config
- Bootstrap cluster
- Deploy AWS Pod Identity service
- Deploy awscli container and test access

Testing files can be found in this [github repo](https://github.com/swibrow/aws-pod-identity-webhook)

### Creating talos image

head over to and download the image required https://factory.talos.dev/

[talos](https://www.talos.dev/v1.7/talos-guides/install/single-board-computers/rpi_generic/) has many guides for installing the os. I've included the first steps for the Raspberry pi 4

Since I'm on MacOS, the following commands will be directed for that.

```shell
$ diskutil list
/dev/disk0 (internal, physical):
   #:                       TYPE NAME                    SIZE       IDENTIFIER
   0:      GUID_partition_scheme                        *500.3 GB   disk0
   1:                        EFI EFI                     314.6 MB   disk0s1
   2:                 Apple_APFS Container disk1         500.0 GB   disk0s2

/dev/disk1 (synthesized):
   #:                       TYPE NAME                    SIZE       IDENTIFIER
   0:      APFS Container Scheme -                      +500.0 GB   disk1
                                 Physical Store disk0s2
   1:                APFS Volume Macintosh HD - Data     260.4 GB   disk1s1
   2:                APFS Volume Preboot                 2.2 GB     disk1s2
   3:                APFS Volume Recovery                1.2 GB     disk1s3
   4:                APFS Volume VM                      4.3 GB     disk1s4
   5:                APFS Volume Macintosh HD            10.3 GB    disk1s5
   6:              APFS Snapshot com.apple.os.update-... 10.3 GB    disk1s5s1

/dev/disk2 (external, physical):
   #:                       TYPE NAME                    SIZE       IDENTIFIER
   0:     FDisk_partition_scheme                        *63.9 GB    disk2
   1:             Windows_FAT_32 RASPIFIRM               532.7 MB   disk2s1
   2:                      Linux                         63.3 GB    disk2s2

```

Find the external drive that will be used for the talos image. In my case its `/dev/disk2`

Download the image and write the file to the external drive. You may need to unmount the disk before being able to write the image `diskutil unmount /dev/disk2`
```
curl -LO https://factory.talos.dev/image/ee21ef4a5ef808a9b7484cc0dda0f25075021691c8c09a276591eedb638ea1f9/v1.7.4/metal-arm64.raw.xz

xz -d metal-arm64.raw.xz

sudo dd if=metal-arm64.raw of=/dev/disk2 conv=fsync bs=4M
```

Slap in the SD card and boot it up. after a few minutes the node will be ready for bootstrapping. It's best if you assign a static IP via DHCP for the PI since we'll be referencing it via IP, my node is assigned `192.168.0.191`
### Creating cluster config

Talos makes configuring a cluster pretty damn easy and we need to set some custom kube-apiserver settings. In this example I'm going to use the Github repo as the OIDC Provider server. We will add files there once the cluster is up and running.

Create `controlplane.patch`

```controlplane.patch
cluster:
  apiServer:
    extraArgs:
        service-account-issuer: https://raw.githubusercontent.com/<github org | user>/<repo>/<branch>/<path>
        service-account-jwks-uri: https://<node_ip>:6443/openid/v1/jwks
  allowSchedulingOnControlPlanes: true
```

```
talosctl gen config \
  sitower \
  https://192.168.0.191:6443 \
  --config-patch-control-plane @controlplane.patch \
  --output ./clusterconfig
```

Create `machine.patch`

```machine.patch
machine:
  network:
    hostname: master-01
```

cd into the clusterconfig directory

```
cd clusterconfig
```

Generate controlplane config

```
talosctl machineconfig patch ./controlplane.yaml --patch @../machine.patch --output master-01.yaml
```

Apply cluster config and wait a minute or two.

```
talosctl apply-config --insecure --nodes 192.168.0.191 --file ./master-01.yaml
```

Add the node to the talosconfig
```
talosctl --talosconfig ./talosconfig config endpoint 192.168.0.191
```

And finally bootstrap the Kubernetes cluster

```
talosctl --talosconfig talosconfig bootstrap --nodes 192.168.0.191
```

While the cluster is coming up dd the cluster to your kubeconfig

```
talosctl --talosconfig talosconfig kubeconfig --nodes 192.168.0.191
```

After about 3 minutes everything should be running

```
$ kubectl get pods -A
NAMESPACE     NAME                                READY   STATUS    RESTARTS       AGE
kube-system   coredns-64b67fc8fd-j6hnb            1/1     Running   0              88s
kube-system   coredns-64b67fc8fd-nj8hw            1/1     Running   0              88s
kube-system   kube-apiserver-master-01            1/1     Running   0              9s
kube-system   kube-controller-manager-master-01   1/1     Running   2 (2m2s ago)   32s
kube-system   kube-flannel-rqrn2                  1/1     Running   0              87s
kube-system   kube-proxy-4llwx                    1/1     Running   0              87s
kube-system   kube-scheduler-master-01            1/1     Running   2 (2m4s ago)   25s

```


In the root of your git repository, create a folder called `.well-known`. Here we'll store the OIDC Provider configurations.

Export the OIDC configuration from the cluster and store wherever you plan to host the public files.

```


kubectl get --raw /.well-known/openid-configuration | jq > .well-known/openid-configuration
kubectl get --raw /openid/v1/jwks | jq > .well-known/jwks
```

open the `openid-configuration` file and replace the issuer with your issuer host and the jwks_uri with the issuer host and suffix `/.well-known/jwks` It should look something like this

```
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

**Make sure id_token_signing_alg_values_supported has RS256**
aws identity webhook only supports RSA keys

Copy the .well_known folder into the location of your OIDC Provider host. In my case, I stored the folder in the root of my Github repo.


## Deploy AWS Pod Identity Webhook

I did a quick scour of the internet and found that someone had already created a helm chart for the [pod identity webhook](https://github.com/jkroepke/helm-charts/tree/main/charts/amazon-eks-pod-identity-webhook)

Cert manager is required to be installed to make use of the cainjector

```
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.15.0/cert-manager.yaml
```

To make things easy, I'll use the built in Kustomize plugin for helm

```kustomization.yaml
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

```namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: aws-identity-webhook
```

```values.yaml
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

```
kustomize build . --enable-helm | kubectl apply -f -
```


Check that all pods are running.


## Create OIDC Provider and IAM roles with Terraform


```hcl
data "tls_certificate" "kubernetes_oidc_staging" {
  url = "https://raw.githubusercontent.com/swibrow/aws-pod-identity-webhook/main"
}

resource "aws_iam_openid_connect_provider" "kubernetes_oidc_staging" {
  url             = "https://raw.githubusercontent.com/swibrow/aws-pod-identity-webhook/main"
  client_id_list  = ["sts.amazonaws.com"]
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
  role       = aws_iam_role.pitower_test.name
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


### And the moment of truth

replace the role arn with your role

```test.yaml
---
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

:rocket:

```
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

Now I can authenticate any pod running in my homelabs to AWS using the IRSA method.

I will refine the setup before adding support into my public homelab cluster [pitower](https://github.com/swibrow/pitower)

References:
- https://github.com/aws/amazon-eks-pod-identity-webhook
- https://www.siderolabs.com/blog/workload-identity-for-kubernetes-on-gcp/
- https://github.com/jkroepke/helm-charts

