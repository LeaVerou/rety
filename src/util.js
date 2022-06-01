// Used in both Recorder and Replayer constructors
export function getEditors(editor) {
	if (editor.nodeType === Node.ELEMENT_NODE) { // editor is a single element
		return {default: editor};
	}
	else if (Array.isArray(editor)) {
		if (editor.length === 1) {
			return {default: editor[0]};
		}
		else {
			// Multiple elements, we need to figure out the ids from the language-* classes
			const langRegex = /^lang(uage)?-/;

			return Object.fromEntries(editor.map(el => {
				let langClass = [...el.classList].find(cls => langRegex.test(cls));
				let id = langClass?.replace(langRegex, "") ?? el.className;
				return [id, el];
			}));
		}
	}
	else { // editor is multiple elements
		return editor;
	}
}

export function packActions (actions) {
	let ret = [];
	let previousAction;

	for (let action of actions) {
		if (previousAction) {
			if (typeof previousAction === "string") {
				// Expand compact insertText action so we can compare it to the new action
				previousAction = {type: "insertText", text: previousAction};
			}

			// Use split: true to compact consequtive single character insertText actions
			if (isCharacterByCharacter(action) && isCharacterByCharacter(previousAction)) {
				ret.pop();
				previousAction = {
					type: "insertText",
					text: previousAction.text + action.text,
					split: true
				};
				ret.push(previousAction);
			}

			if (actionsEqual(previousAction, action)) {
				// Merge consecutive actions
				previousAction.repeat = (previousAction.repeat || 1) + 1;
			}
		}

		// Compact simple insertText actions
		if (action.type === "insertText" && action.text && Object.keys(action) === 2) {
			action = action.text;
		}

		ret.push(action);
		previousAction = action;
	}

	return ret;
}

export function unpackActions (actions) {
	return actions.flatMap(action => {
		if (action.repeat) {
			let times = action.repeat;
			delete action.repeat;
			return Array(times).fill(action);
		}

		if (action.type === "insertText" && action.split) {
			delete action.split;
			return action.text.split("").map(character => Object.assign({}, action, {text: character}));
		}

		return action;
	});
}

function actionsEqual (action1, action2) {
	if (!action1 || !action2) {
		return false;
	}

	let keys1 = Object.keys(action1);
	let keys2 = Object.keys(action2);

	if (JSON.stringify(keys1) !== JSON.stringify(keys2) || keys1.some(key => action1[key] !== action2[key])) {
		return false;
	}

	return true;
}


function isCharacterByCharacter(action) {
	return action.type === "insertText"
		&& (action.text?.length === 1 || action.split)
		&& !action.editor;
}