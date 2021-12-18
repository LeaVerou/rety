function timeout(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export default class Replayer {
	constructor (editor) {
		this.editor = editor;
	}

	async runAll (actions, delay = 200) {
		for (let action of actions) {
			await this.run(action);
			await timeout(delay);
		}
	}

	async run (action) {
		let activeElement = document.activeElement;

		if (this.editor !== activeElement) {
			this.editor.focus();
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
		else if (type === "deleteContentBackward" || type === "deleteByCut" || type === "deleteByDrag") {
			document.execCommand("delete", false, null);
		}
		else if (type === "deleteContentForward") {
			document.execCommand("forwardDelete", false, null);
		}
		else if (type === "historyUndo") {
			document.execCommand("undo", false, null);
		}
		else if (type === "historyRedo") {
			document.execCommand("redo", false, null);
		}
		else if (type === "deleteWordBackward"){
			let after = action.after;
			do {
				document.execCommand("delete", false, null);
			} while (this.editor.selectionStart > 0 && this.editor.selectionStart !== after[0])
		}
		else if (type === "deleteWordForward") {
			let after = action.after;
			do {
				document.execCommand("forwardDelete", false, null);
			} while (this.editor.selectionStart < this.editor.value.length - 1 && this.editor.selectionStart !== after[0])
		}

		this.editor.dispatchEvent(new InputEvent("input", {
			inputType: type,
			data: action.text,
		}));

		if (this.editor !== activeElement) {
			activeElement.focus();
		}
	}
}