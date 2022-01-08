import Recorder from "./src/recorder.js";
import Replayer from "./src/replayer.js";

let initialCode = {
	css: `* {
	color: red;
}`,
	html: `<button>Click me</button>
<button class="pink">Click me</button>`
};

sourceCSS.textContent = initialCode.css;
destCSS.textContent = initialCode.css;
sourceHTML.textContent = initialCode.html;
destHTML.textContent = initialCode.html;

for (let t of $$("#demo-textareas textarea")) {
	t.value = t.textContent;
	t.dispatchEvent(new InputEvent('input'));
}

window.recorder = new Recorder({css: sourceCSS, html: sourceHTML});
window.replayer = new Replayer({css: destCSS, html: destHTML});

function timeout(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

setTimeout(recorder.start(), 1000);

let lastAction;
recorder.addEventListener("actionschange", async function (evt) {
	await lastAction;
	let action = evt.detail.action;

	log.value = stringifyArray(recorder.actions);
	log.dispatchEvent(new InputEvent('input'));

	lastAction = replayer.run(action);
});

replayer.addEventListener("play", async evt => {
	let played = replayer.played;
	let index = played.length;
	let action = evt.detail.action;


	let actionTokens = log.parentNode.querySelectorAll(".token.action");

	for (let i = 0; i < index; i++) {
		let isLast = i === index - 1;
		actionTokens[i].classList.toggle("current", isLast);
		actionTokens[i].classList.toggle("played", !isLast);
	}
});

log.addEventListener("input", evt => {
	try {
		window.logActions = JSON.parse(evt.target.value);
	}
	catch (e) {}
});

function stringifyArray(arr) {
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

function $$(selector, context = document) {
	return Array.from(context.querySelectorAll(selector));
}

function $(s, c = document) {
	return c.querySelector(s);
}

window.Demo = {
	reset () {
		recorder.actions = [];
		replayer.stop();

		for (let t of $$("#demo-textareas textarea.dest")) {
			t.value = t.textContent;
			t.dispatchEvent(new InputEvent('input'));
		}
	},

	rewind () {
		replayer.played = [];
		replayer.queue = logActions;

		for (let t of $$("#demo-textareas textarea.dest")) {
			t.value = t.textContent;
			t.dispatchEvent(new InputEvent('input'));
		}
	},

	async next () {
		let justEnded;

		if (!replayer.queue || replayer.queue.length === 0) {
			if (replayer.played?.length > 0) {
				justEnded = true;
				Demo.cleanup();
			}
			else {
				Demo.prepare();
			}

			Demo.rewind();
		}

		if (!justEnded) {
			await replayer.next();
		}
	},

	async runUntilNextPause () {
		destCSS.focus();

		log_container.classList.add("playing");

		replayer.options.pauses = "pause";

		if (replayer.queue) {
			await replayer.resume();
		}
		else {
			await Demo.runAll({pauses: "pause"})
		}

		log_container.classList.remove("playing");
	},

	async runAll ({pauses = "delay"} = {}) {
		destCSS.focus();

		Demo.prepare();

		replayer.options.pauses = pauses;

		Demo.rewind();

		await replayer.runAll(logActions);

		await timeout(1000);

		Demo.cleanup();
	},

	prepare () {
		log_container.classList.add("playing");
	},

	cleanup () {
		log_container.classList.remove("playing");
		$$(".action:is(.played, .current)").forEach(e => e.classList.remove("played", "current"));
	}
}

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
