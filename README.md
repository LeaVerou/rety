<header>

<img src="logo.svg" style="width: 200px">

# rety
## “Live” coding without the stress

</header>

<section>

## What is this?

Rety is a library that allows you to record the edits you make on one or more pieces of text (usually code)
and replay them later to recreate the same typing flow.

This is particularly useful for orchestrating live demos that run without your presence.

It does not come with any particular UI, the UI is up to you. The UI you see in some of the demos in these docs is not part of Rety.

Here’s an example of using it together with the [Inspire.js](https://inspirejs.org) Live demo plugin to do live demos during a talk:

<iframe width="100%" style="aspect-ratio: 560 / 315" src="https://www.youtube.com/embed/ZuZizqDF4q8?start=436" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

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
Live coding is to programming what a blackboard is to math or physics.

However, it does create a unique challenge: My live coded slides don't make sense without me.
This may be acceptable for a conference talk, which is usually recorded, but not in other contexts,
such as teaching a university course, where all instructors need to be able to teach all lectures, and students need to be able to quickly refer to examples shown.

I didn't want to remove live coding from my slides, as I truly believe it is the perfect implementation of the *"show, don’t tell"* teaching adage,
so I thought instead: what if I could *record* my live coding, and make it replayable?
However, doing so manually seemed like cruel and unusual punishment.
And thus, rety was born (pronounced like the "rety" in "retype").

After using it extensively for [my course at MIT](https://designftw.mit.edu),
I started using it during actual conference talks as well, as it was strictly superior to actual live coding:
It offered the same progressive development which is the primary benefit of live coding,
but none of the fumbling, delays, or mistakes that often come with it.
You can [watch the first conference talk I did with it, at CSS Day 2022 here](https://www.youtube.com/watch?v=ZuZizqDF4q8)
(first live demo at 7:15).

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

#### Constructor: `new Recorder(editor [, options])`

Options:

| Option | Default | Description |
|---|---|---|
| `preserveCaretChanges` | `false` | If true, will not coalesce consecutive caret position changes |
| `pauseThreshold` | `2000` | The delay (in ms) between consecutive actions that will cause a `pause` action to be inserted. Use `0` or `false` to disable pause actions entirely. |
| `pauses` | `undefined` | Set to `"ignore"` to not record pauses entirely.
| `pauseCap` | `undefined` | Set to a number of milliseconds to cap pauses to that duration.
| `keys` | `undefined` | Keystrokes to record, see [How do I record custom keystrokes that don’t produce output?](#record-custom-keystrokes)

To record custom keystrokes (that don’t result in output), you’d use the `keys` parameter with strings like `"Ctrl + Shift + E"`.
You can specify one or more keystrokes as an array.
By default the `keyup` event is monitored. You can specify a different event by using an object instead of a string,
e.g. `{key: "Ctrl + Shift + E", event: "keydown"}`.

#### Methods

| Member | Description |
|---|---|
| `recorder.start()` | Start listening to edits |
| `recorder.pause()` | Temporarily stop listening to edits |

#### Properties and accessors

| Member | Description |
|---|---|
| `recorder.actions` | The array of actions recorded so far.

### `Replayer` class

The `Replayer` class allows you to run a single action or a sequence of actions on an `<input>`, `<textarea>`, or any [replayer-compatible control](#compatible-controls).

#### Constructor: `new Replayer(dest [, options])`

`dest` is the same type as the first argument to the `Recorder` constructor.
To replay actions on a single editor element, `dest` would be a reference to that element.
To replay actions that span multiple editors, `dest` would be an object literal that maps ids to editor elements.

Options:

| Option | Default | Description |
|---|---|---|
| `delay` | `140` | Delay between consecutive actions when `runAll()` is used |
| `pauses` | `"delay"`  | What to do with pause actions? `"delay"` will just pause by that amount of time, `"pause"` will pause playback, `"ignore"` will discard them. You can also provide a function that decides which of these keywords to return based on the action specifics |
| `animated_selection` | `true` | Should selections be animated or happen at once? |

#### Methods

| Member | Description |
|---|---|
| `async replayer.runAll(actions)` | Run a sequence of actions. Returns a promise that resolves when all actions have ran or the replayer has been paused. If another sequence of actions is currently being played, it will stop it first, then replace the rest of its queue.
| `async replayer.queueAll(actions)` | Just like `runAll()` but instead of replacing the queue, it will add the actions to the existing queue.
| `async replayer.next()` | Runs the next action in the queue
| `async replayer.run([action])` | Run a single action (except pauses, since this is pretty low-level and does not handle timing).
| `replayer.pause()` | Finish the action currently executing (if any), then pause.
| `async replayer.resume()` | Resumes playing the current queue.

#### Properties and Accessors

| Member | Description |
|---|---|
| `recorder.queue` | Contains the actions that have been queued up for playing, but have not been played yet. Can also be set, and the array it is set to will be (shallowly) cloned. |
| `recorder.paused` | `true` if the Replayer is paused or stopped, `false` if playing, `undefined` if the Replayer has not yet been used in any way. |
| `recorder.played` | Array with actions that have already been played from the current queue. These actions have been removed from the queue. |

</section>

<section>

## FAQ

<section id="record-page">

### How do I record a demo from an arbitrary page, e.g. [a live coded slide](https://projects.verou.me/talks/css-variables/#button)?

Drag this bookmarklet to your bookmarks toolbar: <a href="javascript:(function(){import('https://rety.verou.me/plugins/bookmarklet.js').then(m => m.default())})()">⏺ Rety</a>.
Then, when you’re ready to record, press it. It will insert a button at the top right corner that you press to stop recording.
When you stop recording, it will log the actions it recorded in the console, for your copying convenience. It will log them in two ways: both as an object, as well as a minified JSON serialization.
Unfortunately, it does not yet allow customizing recording options.

</section>

<section id="browser-support">

### What is the browser support?

Generally: all modern browsers. No IE11 or pre-Chromium Edge. More details:

* `Recorder` makes heavy use of [`evt.inputType`](https://developer.mozilla.org/en-US/docs/Web/API/InputEvent/inputType) so it supports browsers that support that
* `Replayer` makes heavy use of [`document.execCommand()`](https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand), which limits Firefox support to Firefox 89+.
* Both are written with well-supported modern ES features, such as [private members](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_class_fields). Since these generally have better support than `evt.inputType`, I did not bother transpiling.

</section>

<section id="tests">

### What about unit tests?

I’m still trying to decide what's the best testing framework for mocking interactions with a textarea.
If you have suggestions, [please weigh in](https://github.com/LeaVerou/rety/issues/1)!

</section>

<section id="minified">

### Where is the minified version?

This is currently a tiny codebase, so minifying is more trouble than it’s worth.
No, it makes zero difference if you save one KB.
If in the future the code grows enough that minifying adds value, there will be a minified version.

If you *really* can’t live with a non-minified asset, you can always use the [generated version by jsdelivr]().

</section>

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

<section id="record-custom-keystrokes">

### How do I record custom keystrokes that don’t produce output?

When constructing `Recorder` objects, you can pass in a `keys` parameter, which is an array of custom keystrokes to record.
These keystrokes can be specified as strings, like `Ctrl + Enter` or objects (like `{key: "Ctrl + Enter", event: "keydown"}`), if you also want to specify an event (other than `keyup` which is the default).

`Recorder` will then record [`key` actions](#key-actions) that match this keystroke.
`Replayer` does not need to be taught about custom keystrokes, it replicates any `key` action it finds.

</section>

</section>