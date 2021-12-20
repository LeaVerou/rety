const eventsMonitored = ["input", "beforeinput", "select", "paste", "keyup", "pointerdown", "pointerup"];

export default class Recorder extends EventTarget {
	#clipboardText
	#selectionStart
	#selectionEnd

	constructor (editor, options) {
		super();
		this.editor = editor;
		this.options = options || {};
		this.actions = [];
	}

	#addAction (action, {replace} = {}) {
		if (replace) {
			this.actions.pop();
		}

		this.actions.push(action);
		this.dispatchEvent(new CustomEvent("actionschange", {detail: action}));
	}

	handleEvent (evt) {
		let lastAction = this.actions[this.actions.length - 1];

		let start = this.editor.selectionStart;
		let end = this.editor.selectionEnd;

		if (evt.type === "input") {
			let type = evt.inputType;
			let text = evt.data;

			let action = {type};

			if (text !== null) {
				action.text = text;
			}

			if (!type) {
				// No inputType, possibly a synthetic event. Fall back to replacing the entire comments
				action.type = "replace";
				action.text = this.editor.value;
			}
			else if (type === "insertFromPaste" && text === null) {
				// Chrome doesn't include the pasted text in evt.data so we need to get it from the paste event (crbug #1159273)
				// TODO workaround for insertFromDrag as well
				action.type = "insertText";
				action.text = this.#clipboardText;
			}
			else if (type === "insertLineBreak") {
				action.type = "insertText";
				action.text = this.editor.value.substring(this.#selectionEnd, end);
			}
			else if (/^delete(Word|(Soft|Hard)Line)(Forward|Backward)/.test(type)) {
				// Store caret position so we know until which point to delete
				action.after = [start, end];
			}

			// Compact insertText
			if (action.type === "insertText" && action.text) {
				action = action.text;
			}

			this.#addAction(action);
		}

		if (["select", "beforeinput", "keydown", "keyup", "click", "pointerdown", "pointerup"].includes(evt.type)) {
			// Has the caret moved?
			if (this.#selectionStart !== start || this.#selectionEnd !== end) {
				this.#addAction({type: "caret", start, end}, {
					replace: !this.options.preserveCaretChanges && lastAction && lastAction.type === "caret"
				});
			}
		}

		if (evt.type === "paste") {
			this.#clipboardText = evt.clipboardData.getData("text/plain");
		}

		this.#selectionStart = start;
		this.#selectionEnd = end;
	}

	start (options) {
		if (options) {
			this.options = options;
		}

		for (let evt of eventsMonitored) {
			this.editor.addEventListener(evt, this);
		}
	}

	pause () {
		for (let evt of eventsMonitored) {
			this.editor.removeEventListener(evt, this);
		}
	}
}