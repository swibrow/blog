---
title: "Removing Resources from Terraform State"
date: 2025-09-10
description: "How to remove a resource from Terraform state without destroying it."
tags: [til, terraform, hcl]
---

Its the simple stuff I always forget. Remove resource from state but don't destroy it.

```hcl
removed {
  from = aws_instance.example

  lifecycle {
    destroy = false
  }
}
```

The actual resource block (`aws_instance.example`) must also be removed from your configuration files.
