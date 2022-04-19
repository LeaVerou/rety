const eventsMonitored = ["input", "beforeinput", "select", "paste", "keyup", "keydown", "pointerdown", "pointerup"];

export default class Recorder extends EventTarget {
	#clipboardText
	#selectionStart
	#selectionEnd
	#activeEditor
	#timestamp

	constructor (editor, options = {}) {
		super();

		if (editor.nodeType === Node.ELEMENT_NODE) { // editor is a single element
			this.editors = {default: editor};
		}
		else if (Array.isArray(editor)) {
			if (editor.length === 1) {
				this.editors = {default: editor[0]};
			}
			else {
				// Multiple elements, we need to figure out the ids from the language-* classes
				const langRegex = /^lang(uage)?-/;

				this.editors = Object.fromEntries(editor.map(el => {
					let langClass = [...el.classList].find(cls => langRegex.test(cls));
					let id = langClass?.replace(langRegex, "") ?? el.className;
					return [id, el];
				}));
			}
		}
		else { // editor is multiple elements
			this.editors = editor;
		}

		this.options = Object.assign(Recorder.defaultOptions, options);
		this.actions = [];
	}

	get editor () {
		return this.#activeEditor ? this.editors[this.#activeEditor] : this.editors.default;
	}

	get editorCount () {
		return Object.keys(this.editors).length;
	}

	#addAction (action, {replace} = {}) {
		let timestamp = Date.now();

		if (this.options.pauseThreshold && timestamp - this.#timestamp > this.options.pauseThreshold && this.options.pauses !== "ignore") {
			let delay = timestamp - this.#timestamp;

			if (this.options.pauseCap) {
				delay = Math.min(delay, this.options.pauseCap);
			}

			this.actions.push({type: "pause", delay});
		}

		if (replace) {
			this.actions.pop();
		}

		let lastAction = this.actions[this.actions.length - 1];
		let added;

		if (lastAction) {
			if (typeof lastAction === "string") {
				// Expand compact insertText action so we can compare it to the new action
				lastAction = {type: "insertText", text: lastAction};
			}

			if (isCharacterByCharacter(action) && isCharacterByCharacter(lastAction)) {
				this.actions[this.actions.length - 1] = {
					type: "insertText",
					text: lastAction.text + action.text,
					split: true
				};
				added = true;
			}
			else if (Recorder.actionsEqual(lastAction, action)) {
				// Merge consecutive actions
				lastAction.repeat = (lastAction.repeat || 1) + 1;
				added = true;
			}
		}

		if (!added) {
			// Compact insertText
			if (action.type === "insertText" && action.text) {
				action = action.text;
			}

			this.actions.push(action);
		}

		this.dispatchEvent(new CustomEvent("actionschange", {detail: {action}}));

		this.#timestamp = timestamp;
	}

	handleEvent (evt) {
		let previousEditor = this.#activeEditor;

		for (let id in this.editors) {
			if (this.editors[id].contains(evt.target)) {
				this.#activeEditor = id;
				break;
			}
		}

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

			this.#addAction(action);
		}

		if (["select", "beforeinput", "keydown", "keyup", "click", "pointerdown", "pointerup"].includes(evt.type)) {
			// Has the caret moved or the editor changed?
			if (this.#selectionStart !== start || this.#selectionEnd !== end || this.#activeEditor !== previousEditor) {
				let action = {type: "caret", start, end};

				if (this.#activeEditor !== previousEditor && this.editorCount > 1) {
					action.editor = this.#activeEditor;
				}

				let replace = !this.options.preserveCaretChanges
					&& lastAction && lastAction.type === "caret" // last action is also a caret change
					&& !action.editor; // and editor has not changed

				if (replace && lastAction.editor) {
					// Last action switched editor, we need to preserve this
					action.editor = lastAction.editor;
				}

				this.#addAction(action, { replace });
			}
		}

		if (this.options.keys && /^key(down|up)$/.test(evt.type)) {
			let keys = this.options.keys = Array.isArray(this.options.keys) ? this.options.keys : [this.options.keys];

			// Map keys to functions that test if an event matches the specified keystroke
			// Why don’t we just do this in the constructor? Because options.keys may be set at any point
			for (let i=0; i<keys.length; i++) {
				let keystroke = keys[i];

				if (typeof keystroke !== "function") {
					if (typeof keystroke === "string") {
						keystroke = {keys: keystroke};
					}

					if (typeof keystroke.keys === "string") {
						keystroke.keys = keystroke.keys.split(/\s*\+\s*/).map(key => key.toLowerCase());
					}

					keys[i] = evt => {
						let matchesEvent = (!keystroke.event && evt.type === "keyup") || keystroke.event === evt.type;
						let matchesKeys = keystroke.keys.every(key => {
							return evt.key.toLowerCase() === key || evt[key + "Key"];
						});

						return matchesEvent && matchesKeys;
					}
				}
			}

			// Does this event match any of the keystrokes?
			if (keys.some(keystroke => keystroke(evt))) {
				let action = {type: "key", event: evt.type, key: evt.key, code: evt.code};
				["alt", "shift", "ctrl", "meta"].forEach(modifier => action[modifier + "Key"] = evt[modifier + "Key"]);
				this.#addAction(action);
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
			for (let id in this.editors) {
				this.editors[id].addEventListener(evt, this);
			}
		}
	}

	pause () {
		for (let evt of eventsMonitored) {
			for (let id in this.editors) {
				this.editors[id].removeEventListener(evt, this);
			}
		}
	}

	static actionsEqual(action1, action2) {
		if (!action1 || !action2) {
			return false;
		}

		let keys1 = Object.keys(action1);
		let keys2 = Object.keys(action2);

		if (JSON.stringify(keys1) !== JSON.stringify(keys2) || keys1.some(key => action1[key] !== action2[key])) {
			return false;
		}

		return true;
	}

	static defaultOptions = {
		preserveCaretChanges: false,
		pauseThreshold: 2000
	}
}

function isCharacterByCharacter(action) {
	return action.type === "insertText"
		&& (action.text?.length === 1 || action.split)
		&& !action.editor;
}