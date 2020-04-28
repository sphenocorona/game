const http = require("http");
const fs = require("fs");
const url = require("url");
const uuid = require("uuid");
const WebSocket = require("ws");

const config = require("./config.json");

const httpServer = http.createServer(handleHTTPRequest).listen(config.port);

const wsServer = new WebSocket.Server({ server: httpServer });

wsServer.on("connection", handleWSConnection);

const headers = {
	"Content-Type": "text/html"
};

function handleHTTPRequest (req, res) {
	let filename = "site" + url.parse(req.url).pathname;

	if (filename[filename.length - 1] == "/") {
		filename += "index.html";
	}

	fs.readFile(filename, (err, data) => {
		if (err) {
			res.writeHead(404, headers);
			res.write(err.toString());
		} else {
			res.writeHead(200, headers);
			res.write(data);
		}

		res.end();
	});
}

let rooms = {};
let clients = {};

function handleWSConnection (ws) {
	ws.id = uuid.v4();
	clients[ws.id] = {
		public: {
			username: "Guest"
		},
		private: {
			players: {},
			room: undefined
		},
		socket: ws,
		timeout: setTimeout(() => {
			ws.send("b");
			ws.close();
		}, config.timeout)
	};

	updateClient(ws.id);

	console.log(`User connected. ID: ${ws.id}`);

	ws.on("message", getWSMessageHandler(ws));

	ws.on("close", () => {
		leaveRoom(ws.id);

		delete clients[ws.id];

		console.log(`User disconnected. ID: ${ws.id}`);
	});
}

function getWSMessageHandler (ws) {
	return (msg) => {
		let command = msg[0];
		let arg = msg.slice(1);

		switch (command) {
			case "a": // Alive
				clients[ws.id].timeout.refresh();

				break;

			case "b": // Timeout
				console.log(`User ${ws.id} reported server timeout`);

				break;

			case "c": // Create room
				if (clients[ws.id].private.room) {
					ws.send("e0");
					break;
				}

				let roomID;
				while (rooms[roomID = uuid.v4().split("-")[0]]);

				rooms[roomID] = [ws.id];

				clients[ws.id].private.room = roomID;
				clients[ws.id].private.players[ws.id] = clients[ws.id].public;

				console.log(`User ${ws.id} created room ${roomID}`);

				updateClient(ws.id);

				break;

			case "j": // Join room
				if (clients[ws.id].private.room) {
					ws.send("e0");
					break;
				}

				if (!rooms[arg]) {
					ws.send("e1");
					break;
				}

				clients[ws.id].private.room = arg;
				rooms[arg].push(ws.id);

				for (let clientID of rooms[arg]) {
					clients[ws.id].private.players[clientID] = clients[clientID].public;
					clients[clientID].socket.send(`j${ws.id}`);
				}

				console.log(`User ${ws.id} joined room ${arg}`);

				updateClient(ws.id);

				break;

			case "l": // Leave room
				leaveRoom(ws.id);

				updateClient(ws.id);

				break;

			case "s": // Send message
				if (!rooms[clients[ws.id].private.room]) {
					ws.send("e2");
					break;
				}

				for (let clientID of rooms[clients[ws.id].private.room]) {
					clients[clientID].socket.send("r" + ws.id + "|" + arg);
				}

				console.log(`User ${ws.id} sent message in room ${clients[ws.id].private.room}: ${arg}`);

				updateClient(ws.id);

				break;

			case "u": // Set username
				clients[ws.id].public.username = arg;

				if (clients[ws.id].private.room) {
					for (let clientID of rooms[clients[ws.id].private.room]) {
						clients[clientID].socket.send(`c${ws.id}|${arg}`);
					}
				}

				console.log(`User ${ws.id} changed username to ${arg}`);

				updateClient(ws.id);

				break;
		}
	};
}

function updateClient (id) {
	clients[id].socket.send("u" + JSON.stringify({
		public: clients[id].public,
		private: clients[id].private
	}));
}

function leaveRoom (id) {
	let room = clients[id].private.room;

	if (room) {
		let idx = rooms[room].indexOf(id);
		let message = "";

		if (idx == 0) {
			for (let clientID of rooms[room]) {
				clients[clientID].socket.send("d");
				delete clients[clientID].private.players[id];
			}

			delete rooms[room];
		} else {
			for (let clientID of rooms[room]) {
				clients[clientID].socket.send("l" + id);
				delete clients[clientID].private.players[id];
			}

			rooms[room].splice(idx, 1);
		}

		clients[id].private.room = undefined;
		clients[id].private.players = {};

		console.log(`User ${id} left room ${room}`);
	}
}

setInterval(() => {
	for (let clientID in clients) {
		clients[clientID].socket.send("a");
	}
}, config.keepalive);
