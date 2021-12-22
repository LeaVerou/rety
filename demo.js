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



setTimeout(recorder.start(), 1000);

let lastAction;
recorder.addEventListener("actionschange", async function (evt) {
	await lastAction;
	let action = evt.detail;

	log.textContent = stringifyArray(recorder.actions);
	lastAction = replayer.run(action);
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

window.Demo = {
	reset () {
		for (let t of $$("#demo-textareas textarea")) {
			t.value = t.textContent;
			t.dispatchEvent(new InputEvent('input'));
		}
	},

	runOne () {
		replayer.run();
	},

	runUntilNextPause () {
		replayer.options.pauses = "pause";

		if (replayer.queue) {
			replayer.resume();
		}
		else {
			Demo.runAll({pauses: "pause"})
		}

	},

	runAll ({pauses = "delay"} = {}) {
		replayer.options.pauses = pauses;

		for (let t of $$("#demo-textareas textarea.dest")) {
			t.value = t.textContent;
			t.dispatchEvent(new InputEvent('input'));
		}

		replayer.runAll(recorder.actions)
	},


}