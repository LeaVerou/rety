function timeout(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export default class Replayer {
	constructor (editor, options = {}) {
		this.editor = editor;
		this.options = Object.assign(Replayer.defaultOptions, options);
	}

	async runAll (actions) {
		this.queue = actions;
		return this.resume();
	}

	async queueAll (actions) {
		if (!this.queue) {
			this.queue = [];
		}

		this.queue.push(...actions);
		return this.resume();
	}

	async run (action) {
		let activeElement = document.activeElement;

		if (this.editor !== activeElement) {
			this.editor.focus();
		}

		if (typeof action === "string") {
			// Expand compact insertText action
			action = {type: "insertText", text: action};
		}

		let {type, start, end} = action;

		if (start !== undefined) {
			this.editor.selectionStart = start;
		}

		if (end !== undefined) {
			this.editor.selectionEnd = end;
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

		if (this.editor !== activeElement) {
			activeElement.focus();
		}
	}

	pause () {
		this.paused = true;
	}

	async resume () {
		if (!this.queue) {
			throw new TypeError("Nothing to resume");
		}

		this.paused = false;

		while (this.queue.length > 0) {
			if (this.paused === true) {
				return;
			}

			let action = this.queue.shift();
			await this.run(action);
			await timeout(this.options.delay);
		}
	}

	stop () {
		this.paused = true;
		this.queue = null;
	}

	static defaultOptions = {
		delay: 200
	}
}