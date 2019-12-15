module.exports = {
	serialize(method, id, n, total = 0, data = Buffer.alloc(0)) {
		const packet = Buffer.alloc(
			1 +
			32 +
			4 +
			4 +
			data.length
		);

		packet.writeUInt8(method, 0);

		id.copy(packet, 1, 0, 32);

		packet.writeUInt32BE(n, 33);
		packet.writeUInt32BE(total, 37);

		data.copy(packet, 41);

		return packet;
	},

	parse(packet) {
		const method = packet.readUInt8(0);
		const id = packet.slice(1, 33);

		const n = packet.readUInt32BE(33);
		const total = packet.readUInt32BE(37);

		const data = packet.slice(41);

		return { method, id, n, total, data };
	},

	headerSize: 41,
	dataSize: 508 - 41
};
