---
title: "Creating Terraform IDs based on time"
date: 2025-09-28
draft: false
---

When creating terraform resources most of the time they should be unique and dynamic, I like to use a time based ID rather than a random string. This way I can easily identify when the resource was created and order them by time if needed. Date string would probs be better but who doesn't like converting hex to decimal and then to date.

This does cause some chicken and egg problems in Terraform sometimes.

```hcl
resource "time_static" "timestamp_id" {}

locals {
  timestamp_id = format(
    "%x", time_static.timestamp_id.unix
  )

  timestamps = {
    unix = local.timestamp_id
    # will give a 9 character hex string after this date
    four_billion_two_hundred_ninetyfour_million_nine_hundred_sixtyseven_thousand_two_hundred_ninety_five = format(
      "%x", 4294967295
    ) # 2106-02-07 06:28:15
  }
}

output "timestamps" {
  value = local.timestamps
}
```

Random calculation to figure out when the 32 bit unix timestamp will overflow:

`4,294,967,296 seconds / (365.25 * 24 * 3600) ≈ 136 years from 1970 = 2106`
