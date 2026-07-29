<script setup>
/**
 * Homepage promo video.
 *
 * Rendered as a click-to-load facade rather than a bare <iframe>: the poster is
 * self-hosted, so nothing is requested from a Google origin until the visitor
 * asks for the video, and the homepage does not pay YouTube's ~1MB player
 * bundle on first paint. The facade is a single native <button> — one tab stop,
 * one accessible name, no nested interactive content — and activating it hands
 * focus to the player that replaces it, so a keyboard user lands on the thing
 * they just started instead of on a control that no longer exists.
 */
import { nextTick, ref } from 'vue';
import { withBase } from 'vitepress';

const VIDEO_ID = 'HIjLTA7HS64';
const VIDEO_TITLE = 'a11y loop promo';
const VIDEO_DURATION = '2 minutes 59 seconds';
const WATCH_URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`;
// youtube-nocookie: no tracking cookie is set unless playback actually starts.
const EMBED_URL = `https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0&modestbranding=1`;

const isPlaying = ref(false);
const player = ref(null);

async function startPlayback() {
  isPlaying.value = true;
  await nextTick();
  player.value?.focus();
}
</script>

<template>
  <section class="video-showcase" aria-labelledby="video-showcase-heading">
    <div class="video-showcase__inner">
      <p class="video-showcase__eyebrow">Demo</p>
      <h2 id="video-showcase-heading" class="video-showcase__heading">See the loop run</h2>
      <p class="video-showcase__lede">
        Three minutes on what a11y-loop actually does: the standing rules that apply while an
        agent writes UI, the browser audit that re-checks the result across five rendering
        passes and the states the agent just built — and the checklist of what no tool could
        check for you.
      </p>

      <div class="video-showcase__frame">
        <button
          v-if="!isPlaying"
          type="button"
          class="video-showcase__facade"
          :aria-label="`Play video: ${VIDEO_TITLE}, ${VIDEO_DURATION}`"
          @click="startPlayback"
        >
          <img
            class="video-showcase__poster"
            :src="withBase('/video-poster.jpg')"
            alt=""
            width="1280"
            height="720"
            decoding="async"
          />
          <span class="video-showcase__play">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
              <path d="M9.2 6.3 18 12l-8.8 5.7z" fill="currentColor" />
            </svg>
            Play video
          </span>
        </button>

        <iframe
          v-else
          ref="player"
          class="video-showcase__player"
          :src="EMBED_URL"
          :title="`${VIDEO_TITLE} — video player`"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen
        ></iframe>
      </div>

      <p class="video-showcase__meta">
        <span class="video-showcase__caption">{{ VIDEO_TITLE }} &middot; 2:59</span>
        <a class="video-showcase__link" :href="WATCH_URL" target="_blank" rel="noreferrer">
          Watch on YouTube<span class="video-showcase__sr"> (opens in a new tab)</span>
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
            <path
              d="M14 4h6v6M20 4l-8.5 8.5M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </a>
      </p>
    </div>
  </section>
</template>

<style scoped>
.video-showcase {
  box-sizing: border-box;
  padding: 16px 24px 72px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.video-showcase__inner {
  max-width: 960px;
  margin: 0 auto;
}

.video-showcase__eyebrow {
  margin: 0 0 10px;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  line-height: 1.4;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--vp-c-text-2);
}

.video-showcase__heading {
  margin: 0;
  font-family: var(--a11y-font-display);
  font-size: clamp(28px, 4vw, 40px);
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: var(--vp-c-text-1);
}

.video-showcase__lede {
  max-width: 62ch;
  margin: 14px 0 0;
  font-size: 16px;
  line-height: 1.65;
  color: var(--vp-c-text-2);
}

.video-showcase__frame {
  position: relative;
  margin-top: 32px;
  aspect-ratio: 16 / 9;
}

/* The facade and the player occupy the same box, so swapping one for the other
   cannot shift layout. No overflow clipping here — the focus ring is drawn
   outside the card, against the flat page background, where its contrast is
   deterministic rather than dependent on whatever frame YouTube served. */
.video-showcase__facade,
.video-showcase__player {
  box-sizing: border-box;
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 1px solid var(--vp-c-border);
  border-radius: 14px;
  background-color: var(--vp-c-bg-elv);
}

.video-showcase__facade {
  display: block;
  padding: 0;
  cursor: pointer;
}

.video-showcase__poster {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 13px;
}

/* The affordance is an opaque pill in the lower-left rather than a scrim plus a
   centred disc: no tint is laid over the poster, so the frame stays legible,
   and nothing is placed over the middle of the image where a video's own titles
   live. Being fully opaque also means its contrast is computable — text on a
   translucent layer over a photo is exactly the case axe reports as
   undeterminable, and a promo card should not be shipping an open question.
   Cobalt and white are fixed rather than themed: the poster underneath does not
   change between light and dark mode, so neither should the control. White on
   #1d4ed8 is 6.70:1, and the pill fill sits at 5.98:1 against the poster's own
   cream ground — past the 3:1 SC 1.4.11 asks of a component boundary. */
.video-showcase__play {
  position: absolute;
  bottom: 18px;
  left: 18px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 20px 0 16px;
  border-radius: 999px;
  background-color: #1d4ed8;
  color: #ffffff;
  font-family: var(--vp-font-family-base);
  font-size: 15px;
  font-weight: 500;
  line-height: 1;
  box-shadow:
    0 0 0 2px rgba(255, 255, 255, 0.9),
    0 8px 24px rgba(8, 11, 18, 0.32);
}

.video-showcase__facade:hover .video-showcase__play {
  background-color: #1a45bd;
  transform: translateY(-2px);
}

@media (prefers-reduced-motion: no-preference) {
  .video-showcase__play {
    transition:
      background-color 0.25s ease,
      transform 0.25s ease;
  }
}

.video-showcase__facade:focus-visible {
  outline: 3px solid var(--vp-c-brand-1);
  outline-offset: 3px;
}

.video-showcase__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 20px;
  margin: 18px 0 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}

.video-showcase__caption {
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
}

.video-showcase__link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 24px;
  padding: 2px 0;
  font-weight: 500;
  color: var(--vp-c-brand-1);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.video-showcase__link:hover {
  color: var(--vp-c-brand-2);
}

.video-showcase__link:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 3px;
  border-radius: 2px;
}

.video-showcase__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

/* Windows High Contrast: the cobalt fill is dropped in favour of system colors,
   so the play control keeps a real fill/text/border boundary instead of
   collapsing into the poster behind it. */
@media (forced-colors: active) {
  .video-showcase__play {
    background-color: ButtonFace;
    color: ButtonText;
    border: 1px solid ButtonText;
    box-shadow: none;
  }

  .video-showcase__facade:focus-visible,
  .video-showcase__link:focus-visible {
    outline-color: Highlight;
  }
}

@media (max-width: 640px) {
  .video-showcase {
    padding: 8px 22px 56px;
  }

  .video-showcase__play {
    bottom: 12px;
    left: 12px;
    min-height: 40px;
    padding: 0 16px 0 13px;
    font-size: 14px;
  }
}
</style>
