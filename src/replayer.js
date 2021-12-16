function timeout(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export default class Replayer {
	constructor (editor) {
		this.editor = editor;
	}

	async runAll (actions, delay = 500) {
		for (let action of actions) {
			this.run(action);
			await timeout(delay);
		}
	}

	run (action) {
		let activeElement = document.activeElement;

		if (this.editor !== activeElement) {
			this.editor.focus();
		}

		let {type, start, end} = action;

		this.editor.selectionStart = start;

		if (end !== undefined) {
			this.editor.selectionEnd = end;
		}

		if (type === "insertText" || type === "insertFromPaste") {
			document.execCommand("insertText", false, action.text);
		}
		else if (type === "deleteContentBackward") {
			document.execCommand("delete", false, null);
		}
		else if (type === "deleteContentForward") {
			document.execCommand("forwardDelete", false, null);
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

		if (this.editor !== activeElement) {
			activeElement.focus();
		}
	}
}