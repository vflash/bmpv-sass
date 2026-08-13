# bmpv-sass

A SASS library for BEM: class generation and property storage keyed by selector path. Each property (`+p`) or CSS variable (`+v`) is stored in a map under a selector key. Subsequent writes are ignored (first-write-wins) — that's why skins define values in config mode before the main block, and the block picks them up without code duplication.

## Install

```bash
npm install bmpv-sass
```

```sass
@use 'bmpv-sass/bmpv'
```

## API

**Mixins**

| Mixin | Description |
|---|---|
| `+bmpv($block, $cascade:false)` | Root block |
| `+bmpv-config($block, $cascade:false)` | Config mode: `+p`/`+v` are only stored, no CSS emitted |
| `+block` / `+b($elem, $mods)` | Block (via `$b`) or element |
| `+e($name, $mods)` | Element (always non-cascade) |
| `+m($mods)` | Modifier |
| `+p($name, $value)` | Property |
| `+v($name, $value)` | CSS variable (name starts with `--`) |

**Functions**

| Function | Returns |
|---|---|
| `b($elem)` | `Block` or `Block__Element` |
| `v($name, $value)` | `var(--Block--name, value)` or stored value |
| `p($name, $value)` | Stored value |

**Advanced storage API** (`_bmpv_*` — for advanced use cases)

| Function | Behavior |
|---|---|
| `_bmpv_vgetset($name, $value)` | get-or-set (first-write-wins) — used by `+p`/`+v` |
| `_bmpv_vset($name, $value)` | **forced override** — overwrites an existing value |
| `_bmpv_vhas($name)` | `true`/`false` — check without side effects |
| `_bmpv_vget($name, $default)` | Read value without writing (with a default) |

## Modifier syntax

| Call | Selector |
|---|---|
| `+m(primary)` | `.Block--primary` |
| `+m(-disabled)` | `.Block.-disabled` |
| `+m(:hover)` | `.Block:hover` |

## Examples

### Block and elements

```sass
$b: Button

+block
  +p(padding, 10px 20px)

+b(icon)
  +p(margin-right, 8px)
```

```css
.Button { padding: 10px 20px; }
.Button__icon { margin-right: 8px; }
```

### Modifiers

```sass
+block
  +m(primary)
    +p(background, blue)
  +m(-disabled)
    +p(opacity, 0.5)
  +m(:hover)
    +p(color, red)
```

```css
.Button--primary { background: blue; }
.Button.-disabled { opacity: 0.5; }
.Button:hover { color: red; }
```

### CSS variables

```sass
+block
  +v(--bg, #fff)
  background: v(--bg)
```

```css
.Button {
  --Button--bg: #fff;
  background: var(--Button--bg, #fff);
}
```

### Config + Block: theming without duplication

**Config is a storage, block is an emitter.** Config stores values but emits no CSS. Block only emits properties it explicitly calls via `+p`. Therefore every property from config must be **repeated** in block via `+p` — otherwise it won't appear in the output. If block passes a different value, it's ignored (config wins, first-write-wins).

```sass
$b: Button

+bmpv-config
  +p(background, blue)        // stored
  +p(color, white)            // stored
  &:hover
    +p(background, navy)      // stored

+block
  +p(padding, 10px 20px)      // not in config — added
  +p(background, red)         // in config — emits blue, red ignored
  +p(color, black)            // in config — emits white, black ignored
  &:hover
    +p(background, maroon)    // in config — emits navy, maroon ignored
```

```css
.Button {
  padding: 10px 20px;
  background: blue;
  color: white;
}
.Button:hover {
  background: navy;
}
```

### Multi-skin

Problem: many skins → a pile of `$Block_bgColor_primary_hover` variables for each state. Solution: the selector path already serves as the variable name. Skins set property values in config; the block code stays single.

```sass
$b: BpButton

@if SKIN('PSB')
  +bmpv-config
    +block
      &--mode-primary
        +p(background-color, #f26126)
        &:hover
          +p(background-color, darken(#f26126, 3%))

@if SKIN('CAFT')
  +bmpv-config
    +block
      &--mode-primary
        +p(background-color, #2c396b)
        &:hover
          +p(background-color, darken(#2c396b, 3%))

// Block code — single for all skins
+block
  +p(color, white)
  +p(padding, 10px 20px)

  &--mode-primary
    +p(background-color, #ccc)         // fallback, overridden by config
    &:hover
      +p(background-color, darken(#ccc, 3%))
```

For PSB you get `background-color: #f26126`, for CAFT — `#2c396b`. The block code is not duplicated.

### Forced override (multi-skin with overwrite)

By default, `+v`/`+p` in config mode use first-write-wins — a second skin can't overwrite the first. For forced overwrite use `_bmpv_vset`:

```sass
$b: Btn

// Skin A
+bmpv-config
  +p(background, red)
  +p(color, white)

// Skin B wants to override only background
+bmpv-config
  $x: _bmpv_vset(background, blue)

+block
  +p(background, gray)   // ignored — storage already has blue
  +p(color, black)       // ignored — storage already has white
```

```css
.Btn {
  background: blue;
  color: white;
}
```

### Check and read without writing

`_bmpv_vhas` checks for a value without side effects. `_bmpv_vget` reads a value (with a default) without writing it. Only makes sense with `--*` names or inside `+block` (requires `&` context).

```sass
$b: Btn

$before: _bmpv_vhas(--bg)              // false — value not yet set
$default: _bmpv_vget(--bg, #fff)       // #fff — without writing to storage

+bmpv-config
  +v(--bg, red)

$after: _bmpv_vhas(--bg)               // true — value is set
$stored: _bmpv_vget(--bg, #fff)        // red — without side effects
```

### Cascade

By default `+b` generates flat selectors. Cascade mode nests them:

```sass
+bmpv(Menu, true)
  +m(active)
    +b(Item)
      +p(font-weight, bold)
```

```css
.Menu--active .Menu__Item { font-weight: bold; }
```

### `b()` function

Returns the block/element name as a string — for interpolation:

```sass
$b: Card

.test
  content: b()          // Card
  content: b(header)    // Card__header

@keyframes #{b(spin)}
  from
    transform: rotate(0deg)
  to
    transform: rotate(360deg)
```

## License

MIT
