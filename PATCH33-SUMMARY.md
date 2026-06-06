# Patch33 Summary

Built from the current `/Users/hamishnash/Documents/GitHub/chaos-gemstones` repo state.

## Landing page: premium motion and discovery foundation

- Added theme-controlled presentation settings:
  - `animation_preset`: `luxury-fade`, `spring-slide`, or `classic-fade`
  - `enable_parallax`
  - `primary_glow_color`
  - `hero_media_type`: image or video
  - `hero_video_url`
- Added reusable animation wrappers:
  - `LuxuryReveal`
  - `ParallaxScroll`
- Animation wrappers respect `prefers-reduced-motion`.
- Hero can now render a configured background video or image.
- Added a subtle parallax glow accent to the hero.

## Landing page: new modular sections

- Added a `LiveTickerSection` block for homepage announcement/marketplace urgency messaging.
- Added a `ShapeGridSection` block so visitors can browse visually by diamond shape.
- Shape cards link directly to marketplace shape filter URLs.
- Added new homepage layout block types:
  - `ticker`
  - `shape_grid`

## Admin customiser/dashboard controls

- Added controls for:
  - hero media type
  - hero video URL
  - animation preset
  - glow colour
  - parallax toggle
  - ticker enabled/disabled
  - ticker speed
  - ticker announcement lines
  - shape grid enabled/disabled
  - shape grid title
  - shape grid layout mode

## CSS

- Added named CSS classes/keyframes for ticker motion, parallax glow and shape-card hover glow.
- Avoided fragile Tailwind arbitrary classes for CSS-variable-based shadows/gradients.

## Database

- Added migration `20260606143000_motion_landing_theme_fields.sql`.
- The migration backfills the new motion/landing config keys into active `site_configurations.theme_data`.

## Verification

- Ran `git diff --check` successfully.
- Could not run `npm run build` in this Codex environment because `npm` is not installed here. Run the build in the real repo after applying.
