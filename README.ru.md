# bmpv-sass

SASS-библиотека для BEM: генерация классов и хранение свойств по пути селектора. Каждое свойство (`+p`) или CSS-переменная (`+v`) сохраняется в карте с ключом-селектором. Повторная запись игнорируется (first-write-wins) — поэтому скины задают значения в config-режиме до основного блока, а блок их подхватывает без дублирования кода.

## Установка

```bash
npm install bmpv-sass
```

```sass
@use 'bmpv-sass/bmpv'
```

## API

**Миксины**

| Миксин | Описание |
|---|---|
| `+bmpv($block, $cascade:false)` | Корневой блок |
| `+bmpv-config($block, $cascade:false)` | Config-режим: `+p`/`+v` только сохраняются, CSS не эмитится |
| `+block` / `+b($elem, $mods)` | Блок (по `$b`) или элемент |
| `+e($name, $mods)` | Элемент (всегда non-cascade) |
| `+m($mods)` | Модификатор |
| `+p($name, $value)` | Свойство |
| `+v($name, $value)` | CSS-переменная (имя с `--`) |

**Функции**

| Функция | Возвращает |
|---|---|
| `b($elem)` | `Block` или `Block__Element` |
| `v($name, $value)` | `var(--Block--name, value)` или сохранённое значение |
| `p($name, $value)` | Сохранённое значение |

**Advanced storage API** (`_bmpv_*` — для продвинутых кейсов)

| Функция | Поведение |
|---|---|
| `_bmpv_vgetset($name, $value)` | get-or-set (first-write-wins) — используется `+p`/`+v` |
| `_bmpv_vset($name, $value)` | **forced override** — перезаписывает существующее значение |
| `_bmpv_vhas($name)` | `true`/`false` — проверка без побочных эффектов |
| `_bmpv_vget($name, $default)` | Чтение значения без записи (с дефолтом) |

## Синтаксис модификаторов

| Вызов | Селектор |
|---|---|
| `+m(primary)` | `.Block--primary` |
| `+m(-disabled)` | `.Block.-disabled` |
| `+m(:hover)` | `.Block:hover` |

## Примеры

### Блок и элементы

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

### Модификаторы

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

### CSS-переменные

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

### Config + Block: темизация без дублирования

**Config — это хранилище, block — эмиттер.** Config сохраняет значения, но не эмитит CSS. Block эмитит только те свойства, которые явно вызвал через `+p`. Поэтому каждое свойство из config нужно **повторить** в block через `+p` — иначе оно не попадёт в вывод. Если block передаёт другое значение — оно игнорируется (config wins, first-write-wins).

```sass
$b: Button

+bmpv-config
  +p(background, blue)        // сохранено
  +p(color, white)            // сохранено
  &:hover
    +p(background, navy)      // сохранено

+block
  +p(padding, 10px 20px)      // нет в config — добавляется
  +p(background, red)         // есть в config — эмитится blue, red игнорируется
  +p(color, black)            // есть в config — эмитится white, black игнорируется
  &:hover
    +p(background, maroon)    // есть в config — эмитится navy, maroon игнорируется
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

### Мульти-скин

Проблема: много скинов → куча переменных `$Block_bgColor_primary_hover` для каждого стейта. Решение: путь селектора уже работает как имя переменной. Скины задают значения свойств в config, код блока — один.

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

// Код блока — один для всех скинов
+block
  +p(color, white)
  +p(padding, 10px 20px)

  &--mode-primary
    +p(background-color, #ccc)         // fallback, перекрыт config-ом
    &:hover
      +p(background-color, darken(#ccc, 3%))
```

Для PSB выйдет `background-color: #f26126`, для CAFT — `#2c396b`. Код блока не дублируется.

### Forced override (мульти-скин с перезаписью)

По умолчанию `+v`/`+p` в config-режиме используют first-write-wins — второй скин не может перезаписать первый. Для принудительной перезаписи используйте `_bmpv_vset`:

```sass
$b: Btn

// Skin A
+bmpv-config
  +p(background, red)
  +p(color, white)

// Skin B хочет override только background
+bmpv-config
  $x: _bmpv_vset(background, blue)

+block
  +p(background, gray)   // проигнорировано — в storage уже blue
  +p(color, black)       // проигнорировано — в storage уже white
```

```css
.Btn {
  background: blue;
  color: white;
}
```

### Проверка и чтение без записи

`_bmpv_vhas` проверяет наличие значения без побочных эффектов. `_bmpv_vget` читает значение (с дефолтом), не записывая его. Имеет смысл только с `--*` именами или внутри `+block` (требуется `&`-контекст).

```sass
$b: Btn

$before: _bmpv_vhas(--bg)              // false — значения ещё нет
$default: _bmpv_vget(--bg, #fff)       // #fff — без записи в storage

+bmpv-config
  +v(--bg, red)

$after: _bmpv_vhas(--bg)               // true — значение задано
$stored: _bmpv_vget(--bg, #fff)        // red — без побочных эффектов
```

### Каскад

По умолчанию `+b` генерирует плоские селекторы. Cascade-режим вкладывает:

```sass
+bmpv(Menu, true)
  +m(active)
    +b(Item)
      +p(font-weight, bold)
```

```css
.Menu--active .Menu__Item { font-weight: bold; }
```

### Функция `b()`

Возвращает имя блока/элемента как строку — для интерполяции:

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

## Лицензия

MIT
