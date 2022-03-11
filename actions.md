# Rety Actions

Rety records your typing as a sequence of *actions* and creates a *script*.
These actions are just JSON objects and the *script* is an array of actions in order.
Rety tries really hard to produce a script that is hand editable,
so that you can go in and correct any mistakes you made during the recording without having to re-record yourself.

## General structure

This is what a Rety script looks like:

```js
[
	{"type":"caret","start":12,"end":15,"editor":"css"},
	{"type":"insertText","text":"blue","split":true},
	{"type":"pause","delay":14266},
	{"type":"caret","start":8,"end":16,"editor":"html"},
	{"type":"deleteContentBackward"},
	{"type":"insertText","text":"Hi","split":true}
]
```

The only field that all types of actions share is `"type"`.
This tells Rety what this action *does*.
The other properties are different depending on the type of action.
Below we will explore what type of editing action each action type describes and what its properties mean.

## `caret` actions

These actions record changes of position of the caret (including selections).
By default, consecutive `caret` actions are collapsed into the last one
(since you don’t usually want the caret jumping around without anything happening between these changes of position)
but you can change that.

### Properties

* `start`: The start position of the caret
* `end`: The end position of the caret

If `start` is different than `end`, text was selected.

## `insertText` actions

This represents text insertion.
The text may have been inserted by typing keystroke by keystroke, pasting, or other ways (drag & drop etc).

You may also see actions that are just a string instead of an object, e.g. `"foo"`.
This is a shorthand for `{"type":"insertText","text":"foo"}`

### Properties

* `text`: The inserted text
* `split`: The inserted text was inserted keystroke by keystroke instead of all at once.

## `pause` actions

This represents a pause in editing.

By default, Rety only records pauses longer than 2 seconds (customizable).
The actual delay (in milliseconds) is recorded in the `delay` property.
You can set a maximum delay to cap pauses to, so that the script makes sense even if you e.g. stop recording to have a meal.

Often, you will find that these pauses are natural breaking points in your demo.
Therefore, `Replayer` supports multiple different strategies for replaying pauses (actually pausing the playback, stopping until you play again etc).

## `deleteContentBackward`, `deleteContent`, `deleteByCut`, `deleteByDrag` actions

These represent various ways of deleting content.

All of these are treated the same and delete content backwards.

## `deleteContentForward` actions

This represents deleting content on the right (or left in RTL) of the caret.

Content deleted after the caret. If text is selected before this action, this is identical to the previous actions.

## `historyUndo` and `historyRedo` actions

These represent undo and redo.

When replaying, Rety will actually undo and redo on the editor, it will not just simulate undo and redo.
This is generally desirable, but do note that if you are playing actions one by one, or in chunks
and you modify the undo history (e.g. to show something unscripted to the audience) between playing recorded actions, you may end up with a broken result.

## `replace` actions

These are recorded when an `input` event fires in the editor you are recording, with no `inputType` so that Rety can figure out what actually happened.
It contains a single `"text"` property that contains the entirety of the text that the editor should be set to.

These actions are fragile (if you change the script before them, you need to adjust them manually as well)
and bloat your script because instead of recording differences, they are recording snapshots of the entire code.
They are a last resort, when Rety does not have enough information to do something better.
If you see `replace` actions in your Rety scripts, investigate what is causing them.
In most cases it's another script modifying the editor's contents firing synthetic `input` events that are not detailed enough.
File an issue in the script's repo and ask that they include appropriate `inputType` properties in the events they are firing.
