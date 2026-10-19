# demo.gif source

`../demo.gif` is rendered from the literal output of the real CLI, not screen-recorded.
`capture/` holds that output; `render-demo-gif.mjs` draws it as a terminal and encodes the GIF.
The picture is deterministic: same captures and same font give the same GIF.

## Regenerate the picture

This folder has its own dependencies. They are not part of the repo's `package.json`.

```bash
cd docs/demo-gif-src
npm i --no-save @napi-rs/canvas gifenc
node render-demo-gif.mjs            # writes ../demo.gif (1200x680, about 24 s)
```

The font is Cascadia Mono at `C:/Windows/Fonts/CascadiaMono.ttf`. Set `A11Y_GIF_FONT` to any
monospace `.ttf` elsewhere. Remove `node_modules/` afterwards.

## Re-capture after a release

Run from the repo root, then copy the four outputs into `capture/` under these names. The `diff`
header prints the absolute paths it was given, so run it from a short directory.

```bash
node src/cli.js audit --file demo/before/index.html                          > capture/audit.txt
node src/cli.js audit --file demo/before/index.html --out before.json --quiet > capture/q1.txt
node src/cli.js audit --file demo/after/index.html  --out after.json  --quiet > capture/q2.txt
node src/cli.js diff --before before.json --after after.json                 > capture/diff.txt
```

Captured at a11y-loop 0.3.2, axe-core 4.14.0: 159 failures before, 0 after. Update the version in
the window title (`render-demo-gif.mjs`) and the commands' text if the CLI changes.
