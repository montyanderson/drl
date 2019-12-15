const EventEmitter = require('events');
const crypto = require('crypto');
const dgram = require('dgram');

const encoding = require('./encoding');

module.exports = DRLServer;

class DRLServer extends EventEmitter {
	constructor() {
		super();

		this.socket = dgram.createSocket('udp4');

		this.socket.on('message', this.handlePacket.bind(this));

		this.incoming = {};
		this.outgoing = {};
	}

	send(ip, port, message) {
		const id = crypto.randomBytes(32);

		const rawChunks = DRLServer.chunkify(message, encoding.dataSize);

		const chunks = rawChunks.map((data, n) => ({
			n,
			data,
			lastSent: Infinity
		}));

		const total = chunks.length;

		this.outgoing[`${ip}:${port}:${id.toString('base64')}`] = {
			id,
			ip,
			port,
			total,
			chunks
		}
	}

	_autoSend() {
		for(const key in this.outgoing) {
			const message = this.outgoing[key];

			if(typeof message !== 'object') {
				return;
			}

			if(message.chunks.length === 0) {
				continue;
			}

			const chunk = message.chunks[0];

			const packet = encoding.serialize(1, message.id, chunk.n, message.total, chunk.data);

			this.socket.send(packet, message.port, message.ip);
		};
	}

	handlePacket(packet, { address, port }) {
		const { method, id, n, total, data } = encoding.parse(packet);

		const key = `${address}:${port}:${id.toString('base64')}`;

		if(method === 1) {
			const ackPacket = encoding.serialize(2, id, n);

			this.socket.send(ackPacket, port, address);

			if(!(key in this.incoming)) {
				if(n !== 0) {
					return;
				}

				this.incoming[key] = {
					chunks: []
				};
			}

			const message = this.incoming[key];

			message.chunks[n] = data;

			if(message.chunks.length === total && message.chunks.every(chunk => chunk instanceof Buffer)) {
				const completeMessage = Buffer.concat(message.chunks);

				this.incoming[key] = undefined;

				this.emit('message', completeMessage);
			}
		} else {
			// ack
			const message = this.outgoing[key];

			const chunkIndex = message.chunks.findIndex(chunk => chunk.n === n);
			message.chunks.splice(chunkIndex, 1);

			if(message.chunks.length === 0) {
				this.outgoing[key] = undefined;
			}
		}
	}

	listen(...args) {
		this.socket.bind(...args);

		setInterval(() => {
			this._autoSend();
		}, 10);
	}

	static chunkify(data, size) {
		const chunks = [];

		for(let i = 0; i < data.length; i += size) {
			chunks.push(data.slice(i, Math.min(i + size, data.length)));
		}

		return chunks;
	}
}
