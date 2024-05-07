+++
author = "Samuel Wibrow"
title = "Karpenter on k3s in my home lab"
date = "2023-09-23"
description = "Running Karpenter on k3s with AWS IAM roles"
tags = [
    "karpenter",
    "k3s",
    "kubernetes",
    "aws",
    "iam"
]
draft = true
+++


https://github.com/aws/amazon-eks-pod-identity-webhook

Generate secrets

issuer: https://oidc.eks.eu-west-1.amazonaws.com/id/XXXXXXXXXXXXX

s3.us-east-1.amazonaws.com/oidc.pitower.wibrow.net


https://s3.us-east-1.amazonaws.com/oidc.pitower.wibrow.net



aws s3 cp --acl public-read ./discovery.json s3://oidc.pitower.wibrow.net/.well-known/openid-configuration
aws s3 cp --acl public-read ./keys.json s3://oidc.pitower.wibrow.net/keys.json