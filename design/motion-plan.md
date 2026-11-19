# Motion, per skin: the plan

For review before any code. Each skin already sounds like what it depicts. This plan makes
each one move like it too: how things open and close, how they move to a new place, and how
a state changes. Roadmap item 1, size M–L, in three parts.

## What moves

Three kinds of change, and only these:

1. **Openings and closings.** Popups (menu, select, popover, tooltip, combobox, hover card),
   dialogs, drawers and sheets, panels that grow (accordion, collapsible, a tree's
   branches, navigation menu), and toasts.
2. **Moves.** Something goes to a new place: a sortable list's item, a tree's row, a board's
   card, a grid's column, the tab and segmented-control indicators, a switch's thumb.
3. **State changes.** On and off (checkbox, radio, switch), chosen, an error appearing, a
   count changing.

What doesn't move: focus rings (they appear at once, so keyboard users never wait), hover
(a colour change, no movement), text, and anything nobody acted on. No entrance animations
on page sections, no motion on scroll, nothing that loops except progress and the caret.

## How it's built

- **On UI SDK's own state.** UI SDK marks a part with `data-starting-style` and
  `data-ending-style` while it comes and goes, keeps it in the page until it has left,
  measures panels (`--accordion-panel-height` and the like), and gives popups
  `--transform-origin`. Motion is CSS on those, so it runs for an agent's change as for a
  person's, the way the sounds do.
- **Skins set variables, `base.css` draws.** The rule skins already follow. Each skin sets
  how long, which curve, and where an opening starts from (opacity, scale, a shift, a
  clip). `base.css` turns them into transitions. A nested skin moves its own way.
- **Moves need a small helper.** UI SDK leaves sliding items into place to the app ("use CSS,
  View Transitions or a motion library"). A small `glide` helper notes where items were
  before a reorder and slides them from there, at the skin's pace (the usual
  "first, last, invert, play" method, with the browser's own animations). No motion library.
  It serves the sortable list and tree, the board and the grid's columns.
- **Sound and motion agree.** A popup that opens with Studio's clunk drops into place with a
  hard stop; one that opens with Phosphor's beep is drawn line by line.

## Each skin

| | Base | Blueprint | Studio | Phosphor | Ink |
| --- | --- | --- | --- | --- | --- |
| What it is | Neutral | A technical drawing | A synth rack | A video terminal | E-paper |
| Opening | Fade and grow from the trigger, 160 ms | Drawn from the trigger's side at an even pace, 220 ms | Drops into place, hard stop, 110 ms | Drawn top to bottom in scan steps, 90 ms | Appears |
| Closing | Fade and shrink, 110 ms | Erased back toward the trigger, 160 ms | Lifts out, 90 ms | Fades like phosphor cooling, 280 ms | Disappears |
| Move | Glides, eased, 180 ms | Slides along a straight edge, even pace, 200 ms | Snaps to the next detent, 120 ms | Jumps a line at a time, 120 ms | Jumps |
| On and off | Eased, 120 ms | The mark is inked in, 160 ms | A lamp warms up in 60 ms and cools in 280 ms | Inverse video at once | At once |

### Base

The neutral default, and the one most apps will see. Quiet and quick: things fade and grow
from where they came from (popups from their trigger, toasts from their edge), panels ease
open, exits are faster than entries. This is close to what `base.css` does today, made
consistent and tokenised. It carries no metaphor, and shouldn't.

### Blueprint

Lines are drawn, not faded. A popup is revealed from the side its trigger is on, as a pen
would draw it, at an even pace with no ease and no scale. Its hatching is there from the
start. A panel grows the same way, like a dimension line being extended. A checkmark is
drawn left to right. Moves slide in straight lines at an even speed, like a parallel rule.
Nothing bounces; draughtsmen don't overshoot.

### Studio

Hardware with weight and travel. Popups drop a few pixels into place and stop dead, like a
module seated in a rack. Dialogs come down and the backdrop dims like stage lights. Moves
snap to their place as a stepped knob snaps to a detent. On and off is a lamp: an amber
indicator warms up fast and cools slowly. Keys already travel down when pressed; the
switch's throw loses its spring and gets a hard stop.

### Phosphor

A cathode-ray tube draws in lines and fades as its phosphor cools. A popup is drawn top to
bottom in a few visible scan steps, and on closing it fades slowly, leaving its glow behind
for a moment: quick on, slow off. Moves jump by whole rows, as a terminal moves text.
Inverse video (what's chosen) switches at once, as a terminal does. The skin's own rule
stands: no flicker, and nothing blinks but the caret.

### Ink

E-paper doesn't animate; it redraws. Ink keeps every duration at zero, as its design plan
says, whatever the motion setting, and that's its way of moving. One option for you to
decide: e-paper leaves a faint ghost of what was there until the next refresh. A closed
popup could leave its dotted outline for one refresh (about 150 ms) and then clear. That's
two still frames, not an animation, so it keeps the rule. I'd leave it out unless you want
it.

## Reduced motion

When someone asks for less motion, nothing moves, scales, is drawn or slides: every change
lands at once, in every skin, as `base.css` does today. Colour and opacity changes are
instant too. It's the simplest promise to keep, and Ink already lives by it.

## What this plan avoids

The usual motion defaults, which would make every skin feel the same: fade-and-slide-up on
everything, springy overshoot on every control, hover animations on cards, staggered
entrances on lists, and long, slow transitions. Every duration here is under 300 ms, and
exits are quicker than entries, except Phosphor's, where the slow fade is the point.

## Checking it

- **Filmstrips, not just screenshots.** Motion can't be judged from one still frame. For
  each change, I pause the browser's own animations and step through them (every 20 ms) for
  a strip of frames, in all five skins, light and dark, React and Web Components, and send
  you those.
- **Tests.** Each skin's timings and starting points are what the plan says. Reduced motion
  and Ink have nothing running. The glide helper animates a reorder and skips under reduced
  motion. Axe in every skin, as always.
- On the dev server, the gallery gets a "Motion" example: one popup, one panel, one reorder
  and one switch, to try in each skin.

## Parts, in order

1. **Openings and closings** in every skin: the tokens, popups, dialogs, drawers, panels and
   toasts. S–M
2. **State changes:** checks, radios, switches, Studio's lamps, errors. S
3. **Moves:** the glide helper, then the sortable list and tree, the board, the grid's
   columns, and the indicators. M

Each part is its own commit, with filmstrips, docs (a Motion section in Theming, and each
skin's design plan), llms files and skills, as usual.

## For you to decide

1. The five directions above, or changes to any of them.
2. Ink: still, as now (my pick), or the one-refresh ghost on closing.
3. Reduced motion: everything instant (my pick), or short fades kept.
