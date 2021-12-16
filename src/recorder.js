const eventsMonitored = ["input", "beforeinput", "select", "paste"];

export default class Recorder extends EventTarget {
	#clipboardText
	#beforeinput

	constructor (editor) {
		super();
		this.editor = editor;
		this.actions = [];
	}

	#addAction (action) {
		this.actions.push(action);
		this.dispatchEvent(new CustomEvent("action", {detail: action}));
	}

	handleEvent (evt) {
		let lastAction = this.actions.at(-1);

		let start = this.editor.selectionStart;
		let end = this.editor.selectionEnd;

		if (evt.type === "input") {
			let type = evt.inputType;
			let text = evt.data;

			let action = {
				type,
				start: this.#beforeinput.start,
				end: this.#beforeinput.end,
				after: [start, end],
				text,
			};

			if (type === "insertFromPaste" && text === null) {
				// Chrome doesn't include the pasted text in evt.data so we need to get it from the paste event
				action.text = this.#clipboardText;
			}

			this.#addAction(action);

			console.log(evt.inputType, evt.data, start, end);
		}
		else if (evt.type === "beforeinput") {
			console.log(evt.type, evt.inputType, evt.data);
			this.#beforeinput = { evt, start, end};
		}
		else if (evt.type === "select") {
			this.#addAction({
				type: "select",
				start, end,
				direction: this.editor.selectionDirection
			});
		}
		else if (evt.type === "paste") {
			this.#clipboardText = evt.clipboardData.getData("text/plain");
		}
		else {
			console.log(evt.type, start, end);
		}
	}

	start () {
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