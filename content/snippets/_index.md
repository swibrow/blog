+++
title = "Snippets"
+++

## Terraform

### Remove resource from state without deleting

Remove a resource from Terraform management without destroying the actual infrastructure:

```hcl
removed {
  from = aws_instance.example

  lifecycle {
    destroy = false
  }
}
```

The actual resource block (`aws_instance.example`) must also be removed from your configuration files.

