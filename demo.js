import Recorder from "./src/recorder.js";
import Replayer from "./src/replayer.js";

const initialCode = `* {
	color: red;
}`;

source.textContent = source.value = initialCode;
destination.textContent = destination.value = initialCode;

window.recorder = new Recorder(source);
window.replayer = new Replayer(destination);

setTimeout(recorder.start(), 1000);

recorder.addEventListener("action", function (evt) {
	let action = evt.detail;

	log.textContent = stringifyArray(recorder.actions);
	replayer.run(action);
});


function stringifyArray(arr) {
	return "[\n\t" + arr.map(e => JSON.stringify(e)).join(",\n\t") + "\n]";
}