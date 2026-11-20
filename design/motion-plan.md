# Motion, per skin: the plan

Approved on 2026-11-20. Built the same day: openings, closings and panels, then on and off
(switch, checkbox, radio, toggle, a check appearing, an error appearing) and the alert
dialog's nudge at a refused press, then moves: the sortable list, tree and board slide
their items with `shell/glide.ts`, and a switch's thumb and a segmented control's indicator
follow the same timing (`base.css`, the skins' tokens, `feedback.ts`,
`tests/e2e/motion.spec.ts`; documented in `docs/theming.md`). Still to come: the data grid's
columns, which render per row, and a count changing, which waits for a part that shows one. Each skin already sounds like what it depicts. This plan makes
each one move like it too: how things open and close, how they move to a new place, and how
a state changes. Roadmap item 1, size M–L, in three parts. Revised on 2026-11-19 after a
review of how other libraries and design systems handle motion (below).

## What UI SDK says

UISet follows UI SDK first, and its docs say how motion should work on its parts:

- **Motion follows state.** CSS transitions run on `data-starting-style` and
  `data-ending-style`, and UI SDK keeps a part in the page until its exit finishes. Its
  examples grow popups from `--transform-origin`: 96% to full size, with a fade, in 150 ms.
- **Reduced motion, part by part.** Tooltips drop the scale and keep the fade. Toasts keep
  only the fade. The drawer fades instead of sliding, which is built in. Panels, the
  navigation menu, carousels and scrolling change at once.
- **The drawer moves itself.** Leave its travel and its backdrop's opacity to UI SDK; style
  its scale, corners and colours.
- **Tooltips that open at once** in a group get `data-instant`, so they skip the transition.
- **Sliding items into new places** is left to CSS, View Transitions or a motion library.

One thing this changes today: UI SDK's drawer fade runs as a script animation, so UISet's
current reduced-motion reset doesn't stop it. Under reduced motion, UISet's drawers fade
while everything else snaps. Keeping fades, as this plan proposes, makes them agree.

## What others do

Five groups were reviewed: Keyframery, the other library on UI SDK; shadcn and the headless
libraries (Base UI, Radix, React Aria, Headless UI, Ark, Vaul, Sonner, Animate UI, Motion);
the motion-led kits (AffectUI, Plonk, Once UI, Arc); the big design systems (Material 3,
Carbon, Fluent, Apple, Atlassian, Primer, Polaris, Spectrum, Lightning); and the web
platform with WCAG.

Where they agree, and what this plan takes from it:

1. **Small and quick.** Popups fade and grow a little (from 95–98% of their size) out of
   their trigger in 100–250 ms. Dialogs take up to about 300 ms, drawers and toasts 400–500.
   This plan keeps to the same budget.
2. **Arrive slowing down, leave sooner.** Entering motion decelerates. Leaving is shorter
   and speeds up, because it needs less attention. That holds in every skin, with one
   exception: Phosphor's close, explained below.
3. **Transitions, not keyframe animations.** A transition that's interrupted reverses
   smoothly from where it is; a keyframe animation jumps (Base UI, Sonner and React Aria all
   say so). UI SDK's `data-starting-style` and `data-ending-style` are built for transitions.
4. **What's done often doesn't move.** That covers focus rings, hover, a tooltip that opens
   at once because another was just open (UI SDK marks it `data-instant`), and a command
   palette opened from the keyboard many times a day.
5. **Heights grow from a measured size.** CSS's own way to animate to `height: auto` is
   Chrome-only, so panels use the heights UI SDK measures (`--accordion-panel-height` and
   the like).
6. **Personality is in the curve and the shape, more than the duration.** Carbon's two moods
   and Material's two schemes share durations and differ in curves. Here the skins differ in
   shape and curve, and their durations stay in the same band.

Where they split:

- **Reduced motion.** The big design systems (Atlassian, Fluent, Primer, Carbon) turn motion
  off. Apple, MDN, motion specialists and the Motion library keep fades and remove movement.
  WCAG's rule on motion from interaction counts movement, not changes in opacity. This plan
  now proposes keeping fades (decision 3).
- **Motion per theme.** Rare. shadcn's eight styles move identically, and so do AffectUI's
  two. Keyframery's four presets change only speed and curve, and every popup in it scales
  and blurs the same way. Once UI makes motion a theme setting (small, large or none), and
  Material lets a product pick one scheme. Only Plonk, a small React Aria project from
  November 2026, gives each of its four personalities its own motion: named timings for
  pressing, entering, leaving and snapping, stepped curves for its retro and arcade looks,
  and two or three set pieces each. That's the same idea as this plan, and it shows the
  shape works. The shared rules below keep the skins consistent where it matters.

This plan leaves out what several kits do by default: blur on entry (it costs painting,
and Apple advises against animating blur), springs that overshoot, timings of 380–800 ms,
staggered rows, and popups with no exit at all (AffectUI). It takes one speed setting for
the whole app (Keyframery's `--kf-speed`, Animate UI's `tempo`), timings named for what
they do (Plonk), a way to turn motion down for one part of a page (Plonk's
`data-plonk-motion`), and a nudge when a dialog refuses to close (AffectUI).

## What moves

Three kinds of change, and only these:

1. **Openings and closings.** Popups (menu, select, popover, tooltip, combobox, hover card),
   dialogs, panels that grow (accordion, collapsible, a tree's branches, navigation menu),
   and toasts, whose stack follows UI SDK's toast variables. A drawer travels on UI SDK's own
   spring in every skin, since it follows the finger like a system sheet, and UI SDK sets
   how dim the page behind it gets. Skins style the rest: the backdrop's colour, and how the
   sheets stacked behind scale back.
2. **Moves.** Something goes to a new place: a sortable list's item, a tree's row, a board's
   card, a grid's column, the tab and segmented-control indicators, a switch's thumb.
3. **State changes.** On and off (checkbox, radio, switch), chosen, an error appearing, a
   count changing, and a refusal: an alert dialog that won't close on an outside press
   nudges, so the press visibly did something.

What doesn't move: focus rings (they appear at once, so keyboard users never wait), hover
(a colour change), text, tooltips that open at once, the command palette, and anything
nobody acted on. No entrance animations on page sections, no motion on scroll, no staggered
lists, nothing that loops except progress and the caret.

## Rules every skin keeps

1. **Budget.** Popups and panels take 90–220 ms, dialogs up to 260 ms. Nothing takes over
   300 ms except the drawer's spring.
2. **Leaving is quicker**, and a part that's leaving never catches a click.
3. **Nothing waits for motion.** Focus moves and announcements happen when the change starts,
   and a part is usable while it arrives.
4. **Interruptible.** A menu closed while it's still opening goes back from where it is.
5. **Cheap to draw.** Only position, scale and opacity animate, plus clipping for the drawn
   reveals of small parts. No blur, no overshoot.
6. **Two settings for apps.** `--uiset-motion-speed`, 1 by default, scales every duration
   in every skin. `motion="reduce"` on a UISet root turns motion down for that part of the
   page, as the system setting does, so an app can offer its own switch.

## How it's built

- **On UI SDK's own state.** UI SDK marks a part with `data-starting-style` and
  `data-ending-style` while it comes and goes, keeps it in the page until it has left,
  measures panels, and gives popups `--transform-origin`. Motion is CSS transitions on
  those, so it runs for an agent's change as for a person's, the way the sounds do.
- **Skins set variables, `base.css` draws.** Each skin sets a timing for each purpose
  (enter, exit, panel, move, toggle: a duration and a curve) and where an opening starts
  from (opacity, scale, a shift, a clip). `base.css` turns them into transitions. A nested
  skin moves its own way. Reduced motion swaps the variables, not the rules, so every part
  follows.
- **Moves use a small `glide` helper.** UI SDK leaves sliding items into place to the app. The
  helper notes where items were before a reorder and slides them from there, with the
  browser's own animations. The browser's View Transitions were considered and rejected for
  now. A page-wide one blocks the pointer across the whole page while it runs. A second
  reorder makes the first jump to its end. The version scoped to one element is Chrome-only.
  With the helper, the real items stay live, so focus and a second drag work during the
  slide. It serves the sortable list and tree, the board and the grid's columns.
- **Sound and motion agree.** A popup that opens with Studio's clunk drops into place with a
  hard stop; one that opens with Phosphor's beep is drawn line by line.

## Each skin

| | Base | Blueprint | Studio | Phosphor | Ink |
| --- | --- | --- | --- | --- | --- |
| What it is | Neutral | A technical drawing | A synth rack | A video terminal | E-paper |
| Opening | Fades in and grows from 96%, 150 ms | Drawn from the trigger's side at an even pace, 200 ms | Drops 8 px into place and stops dead, 120 ms | Drawn top to bottom in four scan steps, 100 ms | Appears |
| Closing | Fades and shrinks, 100 ms | Erased back toward the trigger, 140 ms | Lifts out, 90 ms | Fades like phosphor cooling, 280 ms | Disappears |
| Panel | Eases open, 200 ms | Extends at an even pace, 200 ms | Opens with a hard stop, 130 ms | Opens a line at a time, 100 ms | Redraws |
| Move | Glides, 200 ms | Slides in a straight line, even speed, 220 ms | Snaps to a detent, 140 ms | Jumps a row at a time, 120 ms | Jumps |
| On and off | Eased, 150 ms | The box fills at once and the check is inked in, 200 ms | Hard stop, 90 ms; the lamp warms in 60 ms, cools in 300 ms | Inverse video at once | At once |

Dialogs take each skin's opening a little longer (Base 200 ms, Blueprint 240, Studio 150,
Phosphor 120), as they're bigger. Built, they close at once: while a modal dialog is still
leaving, UI SDK swallows a click on the page (HISTORY.md, UI SDK issue #34), which breaks
rule 2.

### Base

The neutral default, and the one most apps will see. Quiet and quick, and close to common
practice: things fade and grow from where they came from (popups from their trigger, toasts
from their edge), on a strong decelerating curve, and leave faster than they came. This is
close to what `base.css` does today, made consistent and tokenised. It carries no metaphor,
and shouldn't.

### Blueprint

Lines are drawn, not faded. A popup is revealed from the side its trigger is on, as a pen
would draw it, at an even pace with no ease and no scale. Its hatching is there from the
start. A panel grows the same way, like a dimension line being extended. A checkmark is
drawn left to right. Moves slide in straight lines at an even speed, like a parallel rule.
Nothing bounces; draughtsmen don't overshoot.

### Studio

Hardware with weight and travel. Popups drop a few pixels into place and stop dead, like a
module seated in a rack. The motion starts at full speed, so it answers at once, and is
still moving when it lands. That is the hard stop: no slowing down, no bounce. Dialogs come
down and the backdrop dims like stage lights. Moves snap to their place as a stepped knob
snaps to a detent. On and off is a lamp: an amber indicator warms up fast and cools slowly.

### Phosphor

A cathode-ray tube draws in lines and fades as its phosphor cools. A popup is drawn top to
bottom in a few visible scan steps, and on closing it fades slowly, leaving its glow for a
moment: quick on, slow off. It's the one close slower than its opening. It stays at 280 ms,
and clicks go through it while it fades, so it never holds anyone up. Moves jump by whole
rows, as a terminal moves text. Inverse video (what's chosen) switches at once, as a
terminal does. The skin's own rule stands: no flicker, and nothing blinks but the caret.

### Ink

E-paper doesn't animate; it redraws. Ink keeps every duration at zero, as its design plan
says, whatever the motion setting, and that's its way of moving. Decided on 2026-11-20: no ghost. E-paper
leaves a faint ghost of what was there until the next refresh, and a closed popup could have
left its dotted outline for one refresh, but on real e-paper the ghost is a flaw that readers
refresh away.

## Reduced motion

When someone asks for less motion, nothing moves, grows, is drawn or slides, in any skin.
Things that appear and disappear fade instead, 120 ms in and 90 ms out. Panels, reorders
and switches change at once. Ink stays instant.

Why fades rather than nothing: this is what UI SDK itself does and advises (its drawer
fades, its tooltips and toasts keep their fades, its panels snap). WCAG counts movement,
not opacity, as the motion people need to be able to turn off. Apple's guidance is to
replace movement with fades. A fade still shows what changed without moving anything. The alternative is everything instant, as
UISet does today and as Atlassian, Fluent, Primer and Carbon do.

## What this plan avoids

The usual motion defaults, which would make every skin feel the same: fade-and-slide-up on
everything, springy overshoot on every control, blur on entry, hover animations on cards,
staggered entrances on lists, and long, slow transitions.

## Checking it

- **Filmstrips, not just screenshots.** Motion can't be judged from one still frame. For
  each change, I pause the browser's own animations and step through them (every 20 ms) for
  a strip of frames, in all five skins, light and dark, React and Web Components, and send
  you those.
- **Tests.**
  - Each skin's timings and starting points match this plan.
  - Under reduced motion only fades run, and in Ink nothing does.
  - Focus lands in an opening dialog before its motion ends.
  - A closing part lets clicks through.
  - The glide helper animates a reorder, picks up from mid-slide when a second reorder
    comes, and skips under reduced motion.
  - Axe in every skin, as always.
- On the dev server, the gallery gets a "Motion" example: one popup, one panel, one reorder
  and one switch, to try in each skin.

## Parts, in order

1. **Openings and closings** in every skin: the tokens and the two settings, popups,
   dialogs, panels, toasts, and the drawer's surroundings. S–M
2. **State changes:** checks, radios, switches, Studio's lamps, errors, the dismissal
   nudge. S
3. **Moves:** the glide helper, then the sortable list and tree, the board, the grid's
   columns, and the indicators. M

Each part is its own commit, with filmstrips, docs (a Motion section in Theming, and each
skin's design plan), llms files and skills, as usual.

## For you to decide

1. The five directions as revised above, or changes to any of them. The lab page lets you
   try each one, slowed down if you like.
2. Ink: still, as now (my pick), or the one-refresh ghost on closing.
3. Reduced motion: fades kept and nothing moving (my pick, changed after the review), or
   everything instant, as today.
