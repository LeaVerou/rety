import * as util from "./util.js";

function timeout(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export default class Replayer extends EventTarget {
	constructor (editor, options = {}) {
		super();

		this.editors = util.getEditors(editor);

		this.options = Object.assign({}, Replayer.defaultOptions, options);
	}

	#activeEditor

	get editor () {
		let editors = Object.values(this.editors);
		if (editors.length === 1) {
			return editors[0];
		}

		if (this.#activeEditor) {
			return this.editors[this.#activeEditor];
		}

		return this.editors.default || Object.values(this.editors)[0];
	}

	#queue

	get queue () {
		return this.#queue;
	}

	set queue (actions) {
		 // also clones, as we'll be modifying this array
		this.#queue = actions? util.unpackActions(actions) : null;
	}

	get queue () {
		return this.#queue;
	}

	async runAll (actions) {
		this.played = [];
		this.queue = actions;
		return this.resume();
	}

	async queueAll (actions) {
		if (!this.queue) {
			this.queue = [];
		}

		actions = util.unpackActions(actions);
		this.queue.push(...actions);
		return this.resume();
	}

	async run (action = this.queue.shift()) {
		if (action.editor) {
			if (action.editor in this.editors) {
				this.#activeEditor = action.editor;
			}
			else {
				throw new ReferenceError(`Unknown editor "${action.editor}". Known editors: ${Object.keys(this.editors).join(", ")}`);
			}
		}

		let activeElement = document.activeElement;

		if (this.editor !== activeElement) {
			this.editor.focus();
		}

		if (typeof action === "string") {
			// Expand compact insertText action
			action = {type: "insertText", text: action};
		}

		let {type, start, end} = action;

		let options = Object.assign({}, this.options, action);

		if (type === "caret") {
			// Caret movement
			if (start !== undefined) {
				this.editor.selectionStart = start;
			}

			if (start !== undefined && end !== undefined && start !== end && options.animated_selection) {
				// Animated text selection to look more realistic
				let sign = start < end ? 1 : -1;
				let selectionLength = Math.abs(end - start);
				let multiplier = selectionLength < 10? 2 : 3;
				for (let i = start; (i - end) * sign <= 0; i += sign) {
					this.editor.selectionEnd = i;
					await timeout(multiplier * options.delay / selectionLength);
				}
			}
			else {
				if (end !== undefined) {
					this.editor.selectionEnd = end;
				}
			}
		}

		if (type === "insertText" || type === "insertFromPaste") {
			let ret = document.execCommand("insertText", false, action.text);

			if (ret === false) {
				// Chrome sometimes fails to run this with
				// "We don't execute document.execCommand() this time, because it is called recursively."
				// so we try once more
				await timeout(10);
				document.execCommand("insertText", false, action.text);
			}
		}
		else if (type === "deleteContentBackward" || type === "deleteContent" || type === "deleteByCut" || type === "deleteByDrag") {
			document.execCommand("delete", false, null);
		}
		else if (type === "deleteContentForward") {
			document.execCommand("forwardDelete", false, null);
		}
		else if (type === "deleteEntireSoftLine") {

		}
		else if (type.startsWith("delete")) {
			let after = action.after;
			let command = type.endsWith("Backward")? "delete" : "forwardDelete";

			do {
				document.execCommand(command, false, null);
			}
			while (this.editor.selectionStart > 0
				&& this.editor.selectionStart < this.editor.value.length - 1
				&& this.editor.selectionStart !== after[0]);
		}
		else if (type === "historyUndo") {
			document.execCommand("undo", false, null);
		}
		else if (type === "historyRedo") {
			document.execCommand("redo", false, null);
		}
		else if (type === "replace") {
			if (action.text) {
				this.editor.value = action.text;
			}
		}
		else if (type === "key") {
			let {type, event, ...props} = action;
			let evt = new KeyboardEvent(event, props);
			this.editor.dispatchEvent(evt);
		}
		else if (type in Replayer.customActions) {
			Replayer.customActions[type]({
				replayer: this,
				action,
				editor: this.editor
			});
		}

		let evt;

		if (type === "caret") {
			evt = new Event("select", {bubbles: true})
		}
		else {
			evt = new InputEvent("input", {
				inputType: type,
				data: action.text,
				bubbles: true
			});
		}

		this.editor.dispatchEvent(evt);

		// Chrome does not scroll to the editing position by default
		// Blurring and refocusing the editor fixes this
		this.editor.blur();
		this.editor.focus();

		if (activeElement !== document.body && !Object.values(this.editors).includes(activeElement)) {
			activeElement.focus();
		}
	}

	pause () {
		this.paused = true;
	}

	async next () {
		if (!this.queue || this.queue.length === 0) {
			return;
		}

		let action = this.queue.shift();

		if (action.type === "pause") {
			let options = Object.assign({}, this.options, action);
			let pauses = typeof options.pauses === "function"? options.pauses(action) : options.pauses;

			if (pauses === "delay") {
				await timeout(action.delay);
			}
			else if (pauses === "pause") {
				this.paused = true;
			}
			else if (pauses === "ignore") {
				this.played.push(action);
				return this.next();
			}
		}
		else {
			await this.run(action);

			if (this.options.delay > 0) {
				// Vary delay ± 15% to create the illusion of organic typing
				let deviation = .15;
				let delay = this.options.delay * Math.random() * deviation * 2 + this.options.delay * (1 - deviation);
				await timeout(delay);
			}
		}

		this.played.push(action);

		this.dispatchEvent(new CustomEvent("play", {detail: {action}}));

		return action;
	}

	async resume () {
		if (!this.queue) {
			throw new TypeError("Nothing to resume");
		}

		this.played = this.played || [];
		this.paused = false;

		while (this.queue.length > 0) {
			if (this.paused === true) {
				return;
			}

			await this.next();

		}
	}

	stop () {
		this.paused = true;
		this.queue = this.played = null;
	}

	static defaultOptions = {
		delay: 140,
		pauses: "delay",
		animated_selection: true
	}

	static customActions = {}
}