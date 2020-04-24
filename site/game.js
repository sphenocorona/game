let state = {};

const errors = [
	"You can't create or join a room when you're already in a room!",
	"That room doesn't exist.",
	"Attempted to send message without being in a room"
];

const ws = new WebSocket(`ws://${window.location.host}/`);

let timeout = setTimeout(timeoutCallback, 15000);

ws.onmessage = (event) => {
	let command = event.data[0];
	let arg = event.data.slice(1);
	let arg0 = arg.split("|")[0];
	let arg1 = arg.split("|").slice(1).join("-");

	switch (command) {
		case "a":
			clearTimeout(timeout);
			timeout = setTimeout(timeoutCallback, 15000);

			break;

		case "b":
			alert(`Connection timed out.`);
			ws.close();

			break;

		case "c":
			message(`User ${state.private.players[arg0].username} changed username to ${arg1}`, true);

			break;

		case "d":
			message("Room closed.", true);

			break;

		case "e":
			alert(`Error: ${errors[+arg]}`);

			break;

		case "j":
			message(`${state.private.players[arg].username} joined.`, true);

			break;

		case "l":
			message(`${state.private.players[arg].username} left.`, true);

			break;

		case "r":
			message(`${state.private.players[arg0].username}: ${arg1}`, false);

			break;

		case "u":
			state = JSON.parse(arg);

			break;
	}
}

function timeoutCallback () {
	ws.send("b");
	ws.close();
}

setInterval(() => {
	ws.send("a");
}, 5000);

function message (text, italic) {
	let textNode = document.createTextNode(text);

	let message = document.createElement("div");

	if (italic) {
		let italic = document.createElement("i");
		italic.appendChild(textNode);
		message.appendChild(italic);
	} else {
		message.appendChild(textNode);
	}

	document.getElementById("messages").appendChild(message);
}

function changeUsername () {
	ws.send(`u${document.getElementById("uname").value}`);
}

function joinRoom () {
	ws.send(`j${document.getElementById("room").value}`);
}

function createRoom () {
	ws.send("c");
}

function leaveRoom () {
	ws.send("l");
}

function sendMessage () {
	ws.send(`s${document.getElementById("messagebox").value}`);
}
