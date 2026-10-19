# Authoring Accessibility (F20)

Rule: update alt and description in same change that modifies image/narrative beat.
Recompute durationMs only if min change >10% or crosses 500ms floor.
Pass criteria: alt != description; alt <= 125 chars; description reproduces visible lettering; durationMs >= minMs where minMs = 500 + (words/150)*60000 + 1000 clamped [500,30000].