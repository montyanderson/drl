# drl

Datagram Reliability Layer

> DRL allows you to send large packets of data over UDP with ensured delivery.

## Example

``` javascript
const sender = new DRLServer();
const reciever = new DRLServer();

sender.listen(5000);
reciever.listen(6000);

sender.send('127.0.0.1', 6000, Buffer.from("Hello, World!"));

reciever.on('message', message => {
	console.log(message.toString());
});
```

## How does it work?

DRL splits up your data into packets of 508 bytes and waits for an acknowledgement packet before sending the next.
