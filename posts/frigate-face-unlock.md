---
title: "Opening the Front Door With My Face Using Frigate and Home Assistant"
date: 2026-11-15
description: "Hands-free front door: Frigate face recognition names whoever is on the doorbell camera, and Home Assistant unlatches the smart lock."
author: "Samuel Wibrow"
tags: [home-automation, kubernetes]
---

Arms full of shopping, and the front door wants a code typed into it. I already had all the parts to fix that: [Frigate](https://frigate.video) watching the doorbell camera, Home Assistant talking to it over MQTT, and a smart lock that can retract its latch. Frigate 0.18 does face recognition locally, so the door can just open when one of us walks up.

---

## The pieces

- **Frigate** runs face recognition on the doorbell camera only. Once it is confident who a person is, it puts their name on the tracked object as a `sub_label`.
- **Home Assistant** listens on `frigate/events` and opens the lock when the name is on the allowlist.
- **My phone has to be on the home Wi-Fi.** No phone, no automatic opening.

The Frigate side is two lines, plus opting the other cameras out, since the global switch has to be on for any camera to use it:

```yaml
face_recognition:
  enabled: true

cameras:
  backyard:
    face_recognition:
      enabled: false
```

The automation:

```yaml
triggers:
  - trigger: mqtt
    topic: frigate/events
conditions:
  - condition: template
    value_template: >-
      {% set person = trigger.payload_json.after %}
      {{ trigger.payload_json.type != 'end'
         and person.camera == 'doorbell'
         and 'walkway' in person.current_zones
         and person.sub_label is not none
         and person.sub_label[0] | lower in ['sam', 'partner', 'kid'] }}
  - condition: state
    entity_id: device_tracker.my_phone
    state: home
actions:
  - action: lock.open
    target:
      entity_id: lock.front_door
  - action: notify.mobile_app_my_phone
    data:
      message: "Recognized {{ trigger.payload_json.after.sub_label[0] }}"
  - delay:
      minutes: 2
mode: single
```

A few details that matter:

- **Trigger on `frigate/events`, not `frigate/tracked_object_update`.** The latter fires on every recognition attempt, including the bad ones. `sub_label` only gets set once several attempts average above `recognition_threshold` (0.9 by default).
- **`lock.open`, not `lock.unlock`.** My lock usually sits unlocked anyway; `open` pulls the latch so the door swings in.
- **The trailing `delay` with `mode: single` is the cooldown.** One visit, one opening.
- **The walkway zone** keeps someone walking past on the street from counting.

---

## The first test: it opened for the kid, not me

I uploaded one photo of each of us and walked up to the door. Nothing. The kid walked up a minute later and the door opened straight away.

Frigate keeps every attempt in its training queue with a score, so it was easy to see why. My attempts scored **0**. The photo I'd uploaded was a close-up phone selfie, eyes to mouth filling the frame. What the doorbell sees of me is a small face, at an angle, from above, in bad light. To the model those are two different people.

The kid matched with exactly the same kind of close-up because kids look *up* at the doorbell, which hands it a nearly frontal face.

The fix is to train from the camera itself: walk up a few times, then assign the clear attempts in the **Train** tab to the right name. Frigate's docs suggest 20-30 images per person. Skip the infrared night shots and anything blurry.

---

## Is this a good idea?

Frigate does not do liveness detection, so a decent photo of me held up to the doorbell could probably get in. That's why the Wi-Fi check is there: someone would need my face and my phone in Wi-Fi range of the house. We live somewhere quiet, I wanted it hands-free, and every opening pings my phone with who it was.
