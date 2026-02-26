---
title: "Kubernetes Deployment that OOMKilled"
date: 2025-09-27
draft: false
---

This deployment will eventually get OOMKilled as it tries to allocate more memory than the limit set.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: oomkill-test-deployment
  labels:
    app: oomkill-test
spec:
  replicas: 1
  selector:
    matchLabels:
      app: oomkill-test
  template:
    metadata:
      labels:
        app: oomkill-test
    spec:
      containers:
      - name: memory-eater
        image: python:3-alpine
        command: ["/bin/sh"]
        args:
          - "-c"
          - |
            python3 -c "
            import time
            import sys

            print('Starting memory allocation test...', flush=True)
            memory_list = []
            chunk_size = 10 * 1024 * 1024  # 10MB

            while True:
                try:
                    # Allocate 10MB of memory
                    memory_chunk = bytearray(chunk_size)
                    memory_list.append(memory_chunk)

                    total_mb = (len(memory_list) * chunk_size) / (1024 * 1024)
                    print(f'Allocated {total_mb:.1f} MB', flush=True)

                    time.sleep(2)
                except MemoryError:
                    print('Memory allocation failed!', flush=True)
                    break
            "
        resources:
          requests:
            memory: "64Mi"
            cpu: "10m"
          limits:
            memory: "128Mi"
            cpu: "100m"
```
