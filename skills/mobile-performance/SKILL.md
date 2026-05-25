---
name: mobile-performance
description: Use when changing ShowTELA mobile surfaces, card layouts, motion, rendering behavior, or any work that could affect responsiveness, hydration speed, or one-handed operational use.
---

# Mobile Performance

## Purpose

Protect mobile operational fluency so ShowTELA remains fast, clear, and usable under pressure.

## Core Runtime Laws

- Mobile responsiveness is part of runtime correctness.
- Visual polish never outranks smooth interaction.
- One-handed operational use is the default environment.

## MUST

- Preserve fast first usable view.
- Keep touch targets large and thumb-friendly.
- Prefer low-overhead motion and restrained rendering.
- Preserve reliable hydration and scroll performance on mobile.

## MUST NOT

- Add heavy animation or unnecessary 3D.
- Introduce expensive rerender patterns for cosmetic effect.
- Increase blur, layering, or image cost without clear value.
- Add dense controls or deep navigation to core operational flows.

## Preferred Behaviors

- Optimize for glanceability.
- Compress meaning into low-attention surfaces.
- Use subtle motion only when it improves orientation.
- Prefer calm transitions over continuous activity.

## PR Review Implications

- Does this protect mobile responsiveness?
- Does it preserve thumb-native interaction?
- Does it avoid performance-heavy rendering?
- Does it improve comprehension within seconds?

## Operational Examples

- Good: reduce framing and metadata density on a home surface to improve scan speed.
- Good: use one slow ticker pulse instead of multiple animated indicators.
- Bad: add complex layered motion to prove liveliness.
- Bad: ship a surface that looks premium but stutters on mobile.
