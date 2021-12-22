<header>

<img src="logo.svg" style="max-width: 200px">

# rety
## “Live” coding without the stress

</header>

<section>

## What is this?

Rety is a library that allows you to record the edits you make on one or more pieces of text (usually code)
and replay them later to recreate the same typing flow.

This is particularly useful for orchestrating live demos that run without your presence.

</section>

<section>

## Background & Motivation

I love live coding as a teaching tool, and over the years
[it](https://twitter.com/aarongarciah/status/844212506365235200)
[has become](https://twitter.com/gumnos/status/1118527972342935552)
[part](https://twitter.com/ChrisFerdinandi/status/1027343408187277312)
[of](https://twitter.com/LinnOyenFarley/status/1011650208831287296)
[my](https://twitter.com/feross/status/928018779115724800)
[trademark](https://twitter.com/HenriHelvetica/status/1011630698984361985)
[speaking](https://twitter.com/johnallsopp/status/926417129070456832)
[style](https://bradfrost.com/blog/post/on-speaking/#:~:text=Don%E2%80%99t%20live%20code%20%E2%80%93%20This%20applies%20to%20everyone%20except%20Lea%20Verou%2C%20who%20is%20an%20absolute%20beast).

When combined with some kind of interactive preview,
it allows the speaker to demonstrate not only the final state of a coding snippet, but how you get there, and what the intermediate results are.

However, it does create a unique challenge: My live coded slides don't make sense without me.
This may be acceptable for a conference talk, which is usually recorded, but not in other contexts,
such as teaching a university course, where all instructors need to be able to teach all lectures.

I didn't want to remove live coding from my slides, as I truly belive it is the perfect implementation of the *"show, don’t tell"* teaching adage,
so I thought instead: what if I could *record* my live coding, and make it replayable?
However, doing so manually seemed like cruel and unusual punishment.
And thus, rety was born (pronounced like the "rety" in "retype").

Rety is designed to work well with the code editors of [Prism Live](https://live.prismjs.com/) and [CodeFlask](https://kazzkiq.github.io/CodeFlask/)
but it should work with any `<input>`, `<textarea>` or even [compatible custom elements](#recorder-compatible-controls).

</section>

<section>

## Basic Usage

To record edits on a textarea (`myTextarea`):

```js
import Recorder from "https://rety.verou.me/src/recorder.js";

let recorder = new Recorder(myTextarea);
recorder.start();

recorder.addEventListener("actionschange", evt => {
	// recorder.actions has been updated
	// evt.detail contains the new (or in some cases changed) action
});
```

To replay an array of actions (`actionsArray`) on a textarea (`editor`) with default settings:

```js
import Replayer from "https://rety.verou.me/src/replayer.js";

let replayer = new Replayer(editor);
replayer.runAll(actionsArray);
```

Instead of importing directly from the CDN, you can also use npm:

```
npm install rety
```

</section>

<section>

## API

Rety consists of two classes, residing in correspondingly named modules: `Recorder` and `Replayer`.

### `Recorder` class

The `Recorder` class allows you to record actions on one or more `<input>`, `<textarea>`, or any [recorder-compatible control](#compatible-controls).

```js
let recorder = new Recorder(source);
recorder.start();
```

To record actions from a single editor, `source` can be a reference to that editor.
To record actions from multiple editors, pass in an object literal with identifiers as keys and references to the elements as values.

E.g.

```js
let recorder = new Recorder({
	css: document.querySelector("textarea#css"),
	html: document.querySelector("textarea#html")
});
```

The identifiers can be anything you want, e.g. to record actions in a multi-file editor environment, the ids could be the filenames.

Call `recorder.start()` to start recording and `recorder.pause()` to temporarily pause recording.

You will find any recorded actions in `recorder.actions`.

`recorder` is a subclass of `EventTarget`, meaning it emits events.
You can listen to the `actionschange` event to respond to any change in the `recorder.actions` array.

Most changes to `recorder.actions` will be new actions being added at the end of the array.
However, there are few cases where instead of adding a new action, the previous action is modified instead.
This happens when the caret moves around or the selection is modified without any other action between changes.
To preserve all caret changes as separate actions, you can use the `preserveCaretChanges` option:

```js
let recorder = new Recorder(source, {preserveCaretChanges: true});
```

You can also provide options when calling `start()`:

```js
recorder.start({preserveCaretChanges: true});
```

#### `new Recorder(editor [, options])`

Options:

| Option | Default | Description |
|---|---|---|
| `preserveCaretChanges` | `false` | If true, will not coalesce consecutive caret position changes |
| `pauseThreshold` | `2000` | The delay (in ms) between consecutive actions that will cause a `pause` action to be inserted. Use `0` or `false` to disable pause actions entirely. |


### `Replayer` class

The `Replayer` class allows you to run a single action or a sequence of actions on an `<input>`, `<textarea>`, or any [replayer-compatible control](#compatible-controls).

#### `new Replayer(dest [, options])`

`dest` is the same type as the first argument to the `Recorder` constructor.
To replay actions on a single editor element, `dest` would be a reference to that element.
To replay actions that span multiple editors, `dest` would be an object literal that maps ids to editor elements.

Options:

| Option | Default | Description |
|---|---|---|
| `delay` | `200` | Delay between consecutive actions when `runAll()` is used |

#### `async replayer.runAll(actions)`

Run a sequence of actions. Returns a promise that resolves when all actions have ran or the replayer has been paused.
If another sequence of actions is currently being played, it will stop it first, then replace the rest of its queue.

#### `async replayer.queueAll(actions)`

Just like `runAll()` but instead of replacing the queue, it will add the actions to the queue.

#### `async replayer.run(action)`

Run a single action

#### `replayer.pause()`

Pause the sequence of actions currently running (if any).

Note that pausing does not happen synchronously.
The action currently executing will finish first, but the rest of the queue will not run (until `resume()` is called).

#### `async replayer.resume()`

Resumes playing the current queue.

### Actions

Actions are objects that reflect a change in the status of the editor (e.g. the `<textarea>`).
All actions have a `type` property.

Actions with `type: "caret"` reflect caret position changes (including selections).
They include `start` and `end` properties with the new position of the caret.
By default, multiple consecutive `caret` actions are coalesced, i.e. any new `caret` action effectively replaces the previous one.
This is because in most live demos, the caret moving around is not a significant action.
However, you can use the `preserveCaretChanges` option to disable this.

Actions with `type: "replace"` reflect a complete replace of the contents of the editor.
The text to replace the contents with is in the `text` property.
This never happens organically, but only when libraries replace the editor's contents and fire synthetic `input` events, without an `inputType` property.

Any other action reflects granular editing, and its `type` corresponds to the [`event.inputType`](https://developer.mozilla.org/en-US/docs/Web/API/InputEvent/inputType) property,
with some differences:

- `insertFromPaste` just becomes `insertText` with the pasted content in `text`
- `insertLineBreak` just becomes `insertText` with the line break in `text`
- `deleteByCut` just becomes `delete`

Actions that insert text include the inserted text in the `text` property.

The `deleteWordForward`, `deleteWordBackward`, `deleteSoftLineForward`, `deleteSoftLineBackward`, `deleteHardLineForward`, and `deleteHardLineBackward` actions
also include an `after` property, with the caret position after the action.

Actions with `type: "insertText"` are replaced by their `text` property, to cut down on the size of the actions log (since there is one of these for each character typed).

</section>

<section>

## FAQ

<section id="recorder-compatible-controls">

### I want to record actions from a custom element, not a built-in `<input>` or `<textarea>`

`Recorder` will work fine with any control that meets the following requirements:
- Implements `selectionStart` and `selectionEnd` properties
- Implements a `value` property
- Emits `input` events with suitable [`inputType` properties](https://developer.mozilla.org/en-US/docs/Web/API/InputEvent/inputType)
- Emits [`select`](https://developer.mozilla.org/en-US/docs/Web/API/Element/select_event) events when the selection changes

</section>

<section id="replayer-compatible-controls">

### I want to run actions on a custom element, not a built-in `<input>` or `<textarea>`

`Replayer` will work fine with any control that meets the following requirements:
- Implements writable `selectionStart` and `selectionEnd` properties
- Works well with `document.execCommand()` (the actions used are `insertText`, `delete`, `forwardDelete`, `undo`, `redo`)

</section>

</section>