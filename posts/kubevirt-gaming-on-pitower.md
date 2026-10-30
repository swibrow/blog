---
title: "Gaming on Kubernetes"
date: 2026-10-30
description: "Switching my 3090 Ti between serving LLMs and running a gaming VM on Talos with KubeVirt and the NVIDIA DRA driver, and the upstream bugs Claude vibing found along the way"
author: "Samuel Wibrow"
tags: [kubernetes, ai]
---

![A server rack in the laundry room, cables running to the office](/images/posts/kubevirt-gaming-on-pitower/hero.jpg)
*Generated with Qwen-Image in ComfyUI, on the same RTX 3090 Ti.*

One RTX 3090 Ti. By day it serves LLMs and ComfyUI. By night it's a gaming PC. Both are Kubernetes workloads, because buying a second PC would have been too easy. One command flips between them.

Getting there took a month of spare moments between work, my wife and two kids, 13 patched driver images, and five upstream PRs. Claude Code did most of the digging; I did the testing on real hardware and nodded confidently at the diffs.

![Setup: the cluster in the laundry room, the monitor and keyboard in the office](/images/posts/kubevirt-gaming-on-pitower/setup.png)

## The physical bit

The cluster lives in a 12U rack in the laundry room. The office is a room away, so a long HDMI cable and a long USB cable run from the 3090 Ti and a USB card straight to my desk.

| | |
|---|---|
| Node | worker-ai-01: Ryzen 7 9700X, 64GB, ASUS ProArt B850 |
| OS | Talos v1.14, Kubernetes v1.36 |
| GPUs | RTX 3090 Ti (switches), RTX PRO 4000 Blackwell (always LLMs) |
| USB | Exsys ASM2142 PCIe card, passed through whole |
| Virt | KubeVirt v1.9, CDI, NVIDIA DRA driver v0.5.1 (patched) |
| Guest | [Omarchy](https://omarchy.org), Sunshine for remote play |

## The journey

1. **Proxmox.** The AI worker was a Talos VM on Proxmox, next to Bazzite and Omarchy VMs. A hookscript shut the AI VM down when a desktop VM started. Passthrough pins all guest RAM, so the AI VM was capped at ~55GiB and hung the host twice.
2. **Bare metal.** Wiped Proxmox, installed Talos directly. Full 64GB for models. Proxmox took it well.
3. **KubeVirt + CDI.** VMs as Kubernetes objects, disks from Ceph and a local NVMe.
4. **DRA driver.** Swapped the NVIDIA device plugin for the DRA driver. Its `PassthroughSupport` gate rebinds a GPU from `nvidia` to `vfio-pci` when a VM claims it. On Talos it didn't work. Naturally. That's where the vibing started.
5. **USB card.** Passing single USB devices works until you replug one. Then the VM has to restart. Fixed the old-fashioned way: buying something.

## Switching modes

![One GPU, two jobs](/images/posts/kubevirt-gaming-on-pitower/split.jpg)
*Also generated on the 3090 Ti, in work mode.*

```bash
just game-on   # pause GPU apps, wait for the 3090 Ti to free up, start omarchy
just game-off  # stop omarchy, resume GPU apps
```

> "Game on!" ... "Car!" ... "Game off."

`game-on` does four things:

1. Annotates every KEDA `ScaledObject` in `ai` with `autoscaling.keda.sh/paused-replicas=0` (plus a marker so `game-off` only resumes what it paused).
2. Polls `ResourceClaims` until nothing outside `vms` holds the 3090 Ti.
3. Labels the node `gpu.wibrow.dev/mode=vfio`, which evicts the 3090 Ti's dcgm-exporter. It keeps the card open otherwise.
4. Starts the VM via the KubeVirt subresource API.

The DRA driver then unbinds the card from `nvidia` and hands it to the VM on `vfio-pci`. Stopping the VM reverses it. Simple, if you ignore the 13 driver images behind it.

## The config

Here's the YAML, because nothing says "relaxing evening" like a `ResourceClaimTemplate`. The VM claims the 3090 Ti through the DRA passthrough class. The RTX PRO 4000 publishes a vfio device too, so a CEL selector picks the right card:

```yaml
apiVersion: resource.k8s.io/v1
kind: ResourceClaimTemplate
metadata:
  name: omarchy-vfio
spec:
  spec:
    devices:
      requests:
        - name: gpu
          exactly:
            deviceClassName: vfio.gpu.nvidia.com
            count: 1
            selectors:
              - cel:
                  expression: device.attributes['gpu.nvidia.com'].productName == 'GA102 [GeForce RTX 3090 Ti]'
      config:
        - requests: ["gpu"]
          opaque:
            driver: gpu.nvidia.com
            parameters:
              apiVersion: resource.nvidia.com/v1beta1
              kind: VfioDeviceConfig
              iommu:
                backendPolicy: LegacyOnly   # libvirt needs /dev/vfio/vfio
                enableAPIDevice: true
```

The GPU's HDMI audio function and the USB card are bound to `vfio-pci` at boot by Talos and handed to the VM by KubeVirt:

```yaml
# Talos
apiVersion: v1alpha1
kind: KernelModuleConfig
name: vfio_pci
parameters:
  - ids=10de:1aef,1b21:2142   # 3090 Ti HDMI audio, ASM2142 USB
---
apiVersion: v1alpha1
kind: KernelModuleConfig
name: nvidia_drm
parameters:
  - fbdev=0   # the framebuffer console holds the GPU and wedges the unbind
```

```yaml
# KubeVirt
permittedHostDevices:
  pciHostDevices:
    - pciVendorSelector: "1B21:2142"
      resourceName: kubevirt.io/usb-controller
    - pciVendorSelector: "10DE:1AEF"
      resourceName: nvidia.com/GA102_HDMI_AUDIO
```

```yaml
# VirtualMachine (excerpt)
runStrategy: Manual
template:
  spec:
    resourceClaims:
      - name: gpu
        resourceClaimTemplateName: omarchy-vfio
    domain:
      devices:
        gpus:
          - name: gpu
            claimName: gpu
            requestName: gpu
        hostDevices:
          - name: usb
            deviceName: kubevirt.io/usb-controller
          - name: hdmi-audio
            deviceName: nvidia.com/GA102_HDMI_AUDIO
```

## Why a USB card

KubeVirt's USB passthrough attaches devices by bus and device number. Both have to be plugged in at VM start, and a replug gives the device a new number, so it drops until the VM restarts. Passing the board's own AMD USB controller instead hung the host.

An Exsys ASM2142 PCIe card fixed it. The whole controller goes to the VM as a PCI device, so the guest does its own enumeration. Replug anything, it just works. A sentence I never expected to write about USB.

## Upstream fixes

Every one of these came from a failure on my hardware. The loop: Claude Code reads the driver source and the logs, finds the cause, writes the fix and tests. I build a `-talos.N` image, run it on the cluster, and open the PR once it works. My main contributions are owning the hardware and typing "try again".

| Repo | Problem | PR |
|---|---|---|
| dra-driver-nvidia-gpu | Busy check runs `chroot /host fuser`. Talos ships no `fuser`, so every vfio claim times out. Fix: scan `/proc/*/fd` for the GPU's device number. | [#1504](https://github.com/kubernetes-sigs/dra-driver-nvidia-gpu/pull/1504) |
| dra-driver-nvidia-gpu | `nvidia-persistenced` socket only looked for under the driver root. On Talos it's in `/run`, so it keeps the card open. Fix: disable persistence through the host root. | [#1568](https://github.com/kubernetes-sigs/dra-driver-nvidia-gpu/pull/1568) |
| dra-driver-nvidia-gpu | Every driver switch unbinds the card's HDMI audio function and never rebinds it, so KubeVirt can't attach it. | [#1567](https://github.com/kubernetes-sigs/dra-driver-nvidia-gpu/pull/1567) |
| go-nvlib | Same bug, at the root, where the maintainers asked for it: `Unbind` frees all functions, `BindToDriver` rebinds only one. | [#130](https://github.com/NVIDIA/go-nvlib/pull/130) |
| containerized-data-importer | Release YAML ships `v1alpha1` in the CDI CRD, the operator strips it, Argo CD re-adds it. Permanent drift. | [#4306](https://github.com/kubevirt/containerized-data-importer/pull/4306) ([issue](https://github.com/kubevirt/containerized-data-importer/issues/4305)) |

Until they land, the cluster runs [`ghcr.io/swibrow/dra-driver-nvidia-gpu:v0.5.1-talos.4`](https://github.com/swibrow/dra-driver-nvidia-gpu/tree/talos).

Two problems had no upstream fix:

- `nvidia_drm fbdev=1` holds the GPU inside the kernel, invisible to any process scan. Talos config, not a driver bug.
- dcgm-exporter keeps the card open. Handled by the node label in `just game-on`.

## Moving fast

Without AI, a missing `fuser` deep in a GPU driver is where I'd have given up and gone back to Proxmox. Or worse, read the source myself. With it, an upstream blocker becomes a loop: read the code, patch it, run it, send it back.

Everything is in [swibrow/home-ops](https://github.com/swibrow/home-ops):

- [`kubernetes/apps/pitower/vms/omarchy`](https://github.com/swibrow/home-ops/tree/main/kubernetes/apps/pitower/vms/omarchy)
- [`kubernetes/apps/pitower/kubevirt`](https://github.com/swibrow/home-ops/tree/main/kubernetes/apps/pitower/kubevirt)
- [`kubernetes/apps/pitower/system/dra-driver-nvidia-gpu`](https://github.com/swibrow/home-ops/tree/main/kubernetes/apps/pitower/system/dra-driver-nvidia-gpu)
- [`.justfiles/vm/justfile`](https://github.com/swibrow/home-ops/blob/main/.justfiles/vm/justfile)

All that, just to play some games. Now I just need to find some free time for gaming...
