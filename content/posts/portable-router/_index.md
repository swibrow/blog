+++
author = "Samuel Wibrow"
title = "Monday hacking with Openwrt"
date = "2023-05-02"
description = "Secure travel router with Openwrt"
tags = [
    "raspberrypi",
    "nanopi",
    "r5c",
    "2.5Gbit",
    "LTE"
]
draft = true
+++

I need a small low energy router that allows me to connect back to my home network securely while I'm traveling. Tethering my iphone and actually working perfectly, but having to always have your phone on and paired is bit of a pain so I want to build a small router that I can just plug in and have it connect to my home network and then I can connect to it via Wifi.

I have a few requirements for this router:

- runs on 5v power
- ethernet and wifi
- USB3
- can run wireguard with at least 200mbit
- stable

Normally I would go straight to Raspberry pi4 since I already run a mini cluster of them and they are rock solid. But since its more of a dream to be able to pick up a rpi4 under 200 bucks so I looked into the alternative and found the NanoPi R5C. It has a 2.5Gbit ethernet port and a 1Gbit ethernet port and a USB3 port. It also has a pci-e slot so I can add an LTE modem.


```shell
root@192.168.178.56's password:
 ___    _             _ _    __      __   _
| __| _(_)___ _ _  __| | |_  \ \    / / _| |_
| _| '_| / -_) ' \/ _` | | || \ \/\/ / '_|  _|
|_||_| |_\___|_||_\__,_|_|\_, |\_/\_/|_|  \__|
                          |__/
 -----------------------------------------------------
 FriendlyWrt 22.03.4, r20123-38ccc47687
 -----------------------------------------------------
root@nomad:~# lspci
0001:10:00.0 PCI bridge: Rockchip Electronics Co., Ltd RK3568 Remote Signal Processor (rev 01)
0001:11:00.0 Ethernet controller: Realtek Semiconductor Co., Ltd. RTL8125 2.5GbE Controller (rev 05)
0002:20:00.0 PCI bridge: Rockchip Electronics Co., Ltd RK3568 Remote Signal Processor (rev 01)
0002:21:00.0 Ethernet controller: Realtek Semiconductor Co., Ltd. RTL8125 2.5GbE Controller (rev 05)
```


Firstly, I removed Tecent mirrors for the defaults

and installed [ModemManager](https://openwrt.org/docs/guide-user/network/wan/wwan/modemmanager)


```shell
Tue May  2 20:43:17 2023 daemon.notice netifd: Interface 'broadband' is setting up now
Tue May  2 20:43:17 2023 daemon.notice netifd: broadband (14819): modem available at /org/freedesktop/ModemManager1/Modem/0
Tue May  2 20:43:17 2023 daemon.notice netifd: broadband (14819): starting connection with apn 'internet'...
Tue May  2 20:43:17 2023 daemon.info [3926]: <info>  [modem0] simple connect started...
Tue May  2 20:43:17 2023 daemon.info [3926]: <info>  [modem0] simple connect state (1/8): unlock check
Tue May  2 20:43:17 2023 daemon.notice netifd: broadband (14819): error: couldn't connect the modem: 'GDBus.Error:org.freedesktop.ModemManager1.Error.Core.Unauthorized: Modem is locked with 'ph-net-pin' code; cannot unlock it'
```

```
root@nomad:~# mmcli -m 0
  -----------------------------
  General  |              path: /org/freedesktop/ModemManager1/Modem/0
           |         device id: 0a52d93acfa1c5b3bc4813c09a3bd15bee3cfe65
  -----------------------------
  Hardware |      manufacturer: Sierra Wireless, Incorporated
           |             model: MC7700
           | firmware revision: SWI9200X_03.05.21.01ap
           |      h/w revision: MC7700
           |         supported: gsm-umts, lte
           |           current: gsm-umts, lte
           |      equipment id: 012810002283214
  -----------------------------
  System   |            device: /sys/devices/platform/fd800000.usb/usb1/1-1
           |           drivers: cdc_mbim
           |            plugin: sierra
           |      primary port: cdc-wdm0
           |             ports: cdc-wdm0 (mbim), wwan0 (net)
  -----------------------------
  Status   |              lock: ph-net-pin
           |    unlock retries: ph-net-pin (255)
           |             state: locked
           |       power state: on
           |    signal quality: 0% (cached)
  -----------------------------
  Modes    |         supported: allowed: 2g; preferred: none
           |                    allowed: 3g; preferred: none
           |                    allowed: 4g; preferred: none
           |                    allowed: 2g, 3g; preferred: 3g
           |                    allowed: 2g, 3g; preferred: 2g
           |                    allowed: 2g, 4g; preferred: 4g
           |                    allowed: 2g, 4g; preferred: 2g
           |                    allowed: 3g, 4g; preferred: 4g
           |                    allowed: 3g, 4g; preferred: 3g
           |                    allowed: 2g, 3g, 4g; preferred: 4g
           |                    allowed: 2g, 3g, 4g; preferred: 3g
           |                    allowed: 2g, 3g, 4g; preferred: 2g
           |           current: allowed: 2g, 3g, 4g; preferred: 2g
  -----------------------------
  Bands    |         supported: egsm, dcs, pcs, g850, utran-1, utran-6, utran-5, utran-2,
           |                    eutran-1, eutran-4, eutran-17
           |           current: egsm, dcs, pcs, g850, utran-1, utran-6, utran-5, utran-2,
           |                    eutran-1, eutran-4, eutran-17
  -----------------------------
  IP       |         supported: ipv4, ipv6, ipv4v6
  -----------------------------
  3GPP     |     enabled locks: fixed-dialing, ph-fsim, net-pers, net-sub-pers,
           |                    provider-pers, corp-pers
  -----------------------------
  SIM      |  primary sim path: /org/freedesktop/ModemManager1/SIM/0
  ```