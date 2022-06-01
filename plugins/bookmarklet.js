/*
Used via bookmarklet with:
javascript:(function(){import('https://rety.verou.me/plugins/bookmarklet.js').then(m => m.default())})()
javascript:(function(){import('http://localhost:8002/rety/plugins/bookmarklet.js').then(m => m.default())})()
*/

import Recorder from "../src/recorder.js";

export default function record () {
	// Get visible textareas
	let textareas = [...document.querySelectorAll("[class^='language-']:is(input, textarea)")].filter(t => {
		let rect = t.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) {
			return false;
		}

		// Check visibility
		let el = t;

		while (el) {
			let cs = getComputedStyle(t);

			if (cs.visibility === "hidden" || cs.display === "none") {
				return false;
			}

			el = el.parentElement;
		}

		return true;
	});

	if (textareas.length === 0) {
		console.error("No elements found to record edits on");
		return;
	}

	let recorder = new Recorder(textareas, {
		pauseCap: 5000,
		keys: [
				{keys: "Ctrl + Enter", event: "keydown"},
				{keys: "Meta + Enter", event: "keydown"}
			]
	});

	document.body.insertAdjacentHTML("beforeend", `<button id="rety_stop" style="position: fixed; top: 16px; right: 16px; z-index: 99999">⏹ Stop recording</button>`);
	rety_stop.onclick = evt => {
		recorder.pause();
		console.log(recorder.actions);
		console.log(JSON.stringify(recorder.actions));
		rety_stop.remove();
	}

	recorder.start();

	console.info(`Rety is recording edits on ${textareas.length} elements`);
}