import Recorder from "./src/recorder.js";
import Replayer from "./src/replayer.js";

function $$(selector, context = document) {
	return Array.from(context.querySelectorAll(selector));
}

function $(s, c = document) {
	return c.querySelector(s);
}

function timeout(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

class RetyDemo extends HTMLElement {
	constructor () {
		super();

		this.dom = {};
		this.withSource = this.classList.contains("with-source");

		this.dest = Object.fromEntries($$("textarea:not(.language-actions-json)", this).map(el => [Prism.util.getLanguage(el), el]));

		this.dom.editorWrapper = document.createElement("div");
		this.dom.editorWrapper.classList.add("demo-textareas");
		this.appendChild(this.dom.editorWrapper);

		if (this.withSource) {
			this.sources = {}
			for (let lang in this.dest) {
				let editor = this.dest[lang];
				let source = editor.cloneNode(true);
				editor.classList.add("dest");
				source.classList.add("source");
				this.sources[lang] = source;
			}

			this.dom.editorWrapper.innerHTML = `
			<label class="source-label">
				Make some edits here:
			</label>
			<label class="dest-label">
				Observe them being replayed here:
			</label>`;

			$(".source-label", this.dom.editorWrapper).append(...Object.values(this.sources));

			this.recorder = new Recorder(this.sources);
			setTimeout(() => this.recorder.start(), 1000);
		}
		else {
			this.dom.editorWrapper.innerHTML = `<label class="dest-label">
		</label>`;
		}

		$(".dest-label", this.dom.editorWrapper).append(...Object.values(this.dest));

		for (let t of $$("textarea", this)) {
			t.classList.add("prism-live");
			t.value = t.textContent;
			t.dispatchEvent(new InputEvent('input'));
		}

		this.replayer = new Replayer(this.dest);

		this.insertAdjacentHTML("beforeend", `<div class="controls">
		<button onclick="this.closest('rety-demo').reset()">⏏️ Reset</button>
		<button onclick="this.closest('rety-demo').rewind()">⏮ Rewind</button>
		<button onclick="this.closest('rety-demo').next()">▶️ Play next</button>
		<button onclick="this.closest('rety-demo').runUntilNextPause()">▶️ Play section</button>
		<button onclick="this.closest('rety-demo').runAll()">▶️ Play from beginning</button>
		<button onclick="this.closest('rety-demo').replayer.pause()">⏸ Pause</button>
		<button onclick="this.closest('rety-demo').replayer.resume()">▶️ Resume</button>
	</div>
	<p>Actions log:</p>
	<div class="log-container">

	</div>`);

		this.dom.log_container = $(".log-container", this);
		this.log = $("textarea.language-actions-json", this);

		if (this.log) {
			// Existing actions log
			this.log.classList.add("log", "prism-live");
			this.dom.log_container.append(this.log);
		}
		else {
			this.dom.log_container.innerHTML = `<textarea class="log language-actions-json prism-live"></textarea>`;
			this.log = $(".log", this.dom.log_container);
		}

		if (this.recorder) {
			let lastAction;
			this.recorder.addEventListener("actionschange", async evt => {
				await lastAction;
				let action = evt.detail.action;

				this.log.value = formatActionsArray(this.recorder.actions);
				this.log.dispatchEvent(new InputEvent('input'));

				lastAction = this.replayer.run(action);
			});
		}

		this.replayer.addEventListener("play", async evt => {
			let played = this.replayer.played;
			let index = played.length;
			let action = evt.detail.action;


			let actionTokens = this.log.parentNode.querySelectorAll(".token.action");

			for (let i = 0; i < index; i++) {
				let isLast = i === index - 1;
				actionTokens[i].classList.toggle("current", isLast);
				actionTokens[i].classList.toggle("played", !isLast);
			}
		});

		this.log.addEventListener("input", evt => this.#updateLogActions());

		if (this.log.value) {
			this.#updateLogActions();
		}
	}

	#updateLogActions () {
		try {
			this.logActions = JSON.parse(this.log.value);
		}
		catch (e) {}
	}

	reset () {
		this.recorder.actions = [];
		this.replayer.stop();

		for (let t of $$("textarea.dest", this)) {
			t.value = t.textContent;
			t.dispatchEvent(new InputEvent('input'));
		}
	}

	rewind () {
		this.replayer.played = [];
		this.replayer.queue = this.logActions;

		for (let t of $$("textarea.dest", this)) {
			t.value = t.textContent;
			t.dispatchEvent(new InputEvent('input'));
		}
	}

	async next () {
		let justEnded;

		if (!this.replayer.queue || this.replayer.queue.length === 0) {
			if (this.replayer.played?.length > 0) {
				justEnded = true;
				this.cleanup();
			}
			else {
				this.prepare();
			}

			this.rewind();
		}

		if (!justEnded) {
			await this.replayer.next();
		}
	}

	async runUntilNextPause () {
		this.replayer.editor.focus();

		this.dom.log_container.classList.add("playing");

		this.replayer.options.pauses = "pause";

		if (this.replayer.queue) {
			await this.replayer.resume();
		}
		else {
			await this.runAll({pauses: "pause"})
		}

		this.dom.log_container.classList.remove("playing");
	}

	async runAll ({pauses = "delay"} = {}) {
		this.replayer.editor.focus();

		this.prepare();

		this.replayer.options.pauses = pauses;

		this.rewind();

		await this.replayer.runAll(this.logActions);

		await timeout(1000);

		this.cleanup();
	}

	prepare () {
		this.dom.log_container.classList.add("playing");
	}

	cleanup () {
		this.dom.log_container.classList.remove("playing");
		$$(".action:is(.played, .current)").forEach(e => e.classList.remove("played", "current"));
	}
}

function formatActionsArray(arr) {
	let ret = "[\n\t";

	for (let i = 0; i < arr.length; i++) {
		let e = arr[i];
		let str = JSON.stringify(e);
		let isLast = i === arr.length - 1;
		let isLong = str.length > 5;

		if (isLong && ret.endsWith(", ")) {
			ret += "\n\t";
		}

		ret += str + (isLast? "\n" : (isLong? ",\n\t" : ", "));
	}
	return ret + "]";
}

customElements.define("rety-demo", RetyDemo);

Prism.languages["actions-json"] = {
	"action-delete": /\{"type":"delete.+?\}/gm,
	"action-pause": /\{"type":"pause".+?\}/gm,
	"action-caret": /\{"type":"caret".+?\}/gm,
	"action": /\{.*"type":.+?\}/gm,
	"compact-action": /"\\"\\""|(?<=,\s*)".+?"/gm,
	"punctuation": /[\[\],]/g
}

for (let token in Prism.languages["actions-json"]) {
	if (token === "punctuation") {
		continue;
	}

	Prism.languages["actions-json"][token] = {
		pattern: Prism.languages["actions-json"][token],
		inside: Prism.languages.json,
		alias: "action"
	};
}
// Prism.Live.registerLanguage("actions-json", {

// });
