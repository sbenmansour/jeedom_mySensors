var net = require('net');
var fs = require('fs');
var request = require('request');

var urlJeedom = '';
var gwAddress = '';
var type = '';
var fs = require('fs');
var appendedString="";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

process.argv.forEach(function(val, index, array) {
	switch ( index ) {
		case 2 : urlJeedom = val; break;
		case 3 : gateway = val; break;
		case 4 : gwAddress = val; break;
		case 5 : type = val; break;
		case 6 : debug = val; break;
	}
});

urlJeedom = urlJeedom + '&gateway=' + gateway;

const BROADCAST_ADDRESS				= 255;
const NODE_SENSOR_ID				= 255;

const C_PRESENTATION				= 0;
const C_SET							= 1;
const C_REQ							= 2;
const C_INTERNAL					= 3;
const C_STREAM						= 4;

const I_BATTERY_LEVEL				= 0;
const I_TIME						= 1;
const I_VERSION						= 2;
const I_ID_REQUEST					= 3;
const I_ID_RESPONSE					= 4;
const I_INCLUSION_MODE				= 5;
const I_CONFIG						= 6;
const I_PING						= 7;
const I_PING_ACK					= 8;
const I_LOG_MESSAGE					= 9;
const I_CHILDREN					= 10;
const I_SKETCH_NAME					= 11;
const I_SKETCH_VERSION				= 12;
const I_REBOOT						= 13;

const ST_FIRMWARE_CONFIG_REQUEST	= 0;
const ST_FIRMWARE_CONFIG_RESPONSE	= 1;
const ST_FIRMWARE_REQUEST			= 2;
const ST_FIRMWARE_RESPONSE			= 3;
const ST_SOUND						= 4;
const ST_IMAGE						= 5;

function encode(destination, sensor, command, acknowledge, type, payload) {
	var msg = destination.toString(10) + ";" + sensor.toString(10) + ";" + command.toString(10) + ";" + acknowledge.toString(10) + ";" + type.toString(10) + ";";
	if (command == 4) {
		for (var i = 0; i < payload.length; i++) {
			if (payload[i] < 16)
			msg += "0";
			msg += payload[i].toString(16);
		}
	} else {
		msg += payload;
	}
	msg += '\n';
	return msg.toString();
}

function connectJeedom(url) {
	jeeApi = urlJeedom + url;
	request(jeeApi, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			if (debug == 1) {console.log((new Date()) + " - Return OK from Jeedom");}
		}else{
			console.log((new Date()).toLocaleString(), error);
		}
	});
}

function saveSensor(sender, sensor, type) {
	url = "&messagetype=saveSensor&type=mySensors&id="+sender.toString()+"&sensor=" + sensor.toString() + "&value="+type;
	connectJeedom(url);
}

function saveGateway(status) {
	url = "&messagetype=saveGateway&type=mySensors&status="+status;
	connectJeedom(url);
}

function saveValue(sender, sensor, ack, type, payload) {
	url = "&messagetype=saveValue&type=mySensors&id="+sender.toString()+"&sensor=" + sensor.toString() +"&donnees=" + type.toString() + "&value="+payload;
	connectJeedom(url);
}

function getValue(sender, sensor, type, gw) {
	url = urlJeedom + "&messagetype=getValue&type=mySensors&id="+sender.toString()+"&sensor=" + sensor.toString() +"&donnees=" + type.toString();
	connectJeedom(url);
}

function saveBatteryLevel(sender, payload ) {
	url = urlJeedom + "&messagetype=saveBatteryLevel&type=mySensors&id="+sender.toString()+"&value="+payload;
	connectJeedom(url);
}

function saveSketchName(sender, payload) {
	url = urlJeedom + "&messagetype=saveSketchName&type=mySensors&id="+sender.toString()+"&value="+payload;
	connectJeedom(url);
}

function saveSketchVersion(sender, payload ) {
	url = urlJeedom + "&messagetype=saveSketchVersion&type=mySensors&id="+sender.toString()+"&value="+payload;
	connectJeedom(url);
}

function saveLibVersion(sender, payload ) {
	url = urlJeedom + "&messagetype=saveLibVersion&type=mySensors&id="+sender.toString()+"&value="+payload;
	connectJeedom(url);
}

function sendTime(destination, sensor, gw) {
	var payload = new Date().getTime()/1000;
	var td = encode(destination, sensor, C_INTERNAL, "0", I_TIME, payload);
	console.log('-> ' + td.toString());
	gw.write(td);
}

function sendNextAvailableSensorId( gw) {
	url = urlJeedom + "&messagetype=getNextSensorId";
	connectJeedom(url);
}

function sendConfig(destination, gw) {
	var td = encode(destination, NODE_SENSOR_ID, C_INTERNAL, "0", I_CONFIG, "M");
	console.log('-> ' + td.toString());
	gw.write(td);
}

function appendData(str, db, gw) {
	pos=0;
	while (str.charAt(pos) != '\n' && pos < str.length) {
		appendedString=appendedString+str.charAt(pos);
		pos++;
	}
	if (str.charAt(pos) == '\n') {
		rfReceived(appendedString.trim(), db, gw);
		appendedString="";
	}
	if (pos < str.length) {
		appendData(str.substr(pos+1,str.length-pos-1), db, gw);
	}
}

function rfReceived(data, db, gw) {
	if ((data != null) && (data != "")) {
		if (debug == 1) {console.log((new Date()) + " - "  + td.toString());}
		//LogDate("debug", "-> "  + td.toString() );
		// decoding message
		var datas = data.toString().split(";");
		var sender = +datas[0];
		var sensor = +datas[1];
		var command = +datas[2];
		var ack = +datas[3];
		var type = +datas[4];
		var rawpayload="";
		if (datas[5]) {
			rawpayload = datas[5].trim();
		}
		var payload;
		if (command == C_STREAM) {
			payload = [];
			for (var i = 0; i < rawpayload.length; i+=2)
			payload.push(parseInt(rawpayload.substring(i, i + 2), 16));
		} else {
			payload = rawpayload;
		}
		// decision on appropriate response
		switch (command) {
			case C_PRESENTATION:
			if (sensor == NODE_SENSOR_ID)
			//	saveProtocol(sender, payload, db); //arduino ou arduino relay
			;
			else
			saveSensor(sender, sensor, type);
			saveLibVersion(sender, payload);
			break;
			case C_SET:
			saveValue(sender, sensor, ack, type, payload);
			break;
			case C_REQ:
			getValue(sender, sensor, type, gw);
			break;
			case C_INTERNAL:
			switch (type) {
				case I_BATTERY_LEVEL:
				saveBatteryLevel(sender, payload, db);
				break;
				case I_TIME:
				sendTime(sender, sensor, gw);
				break;
				case I_VERSION:
				saveLibVersion(sender, payload);
				break;
				case I_ID_REQUEST:
				sendNextAvailableSensorId(gw);
				break;
				case I_ID_RESPONSE:
				break;
				case I_INCLUSION_MODE:
				break;
				case I_CONFIG:
				sendConfig(sender, gw);
				break;
				case I_PING:
				break;
				case I_PING_ACK:
				break;
				case I_LOG_MESSAGE:
				break;
				case I_CHILDREN:
				break;
				case I_SKETCH_NAME:
				saveSketchName(sender, payload);
				break;
				case I_SKETCH_VERSION:
				saveSketchVersion(sender, payload);
				break;
				case I_REBOOT:
				break;
			}
			break;
			case C_STREAM:
			switch (type) {
				case ST_FIRMWARE_CONFIG_REQUEST:
				break;
				case ST_FIRMWARE_CONFIG_RESPONSE:
				break;
				case ST_FIRMWARE_REQUEST:
				break;
				case ST_FIRMWARE_RESPONSE:
				break;
				case ST_SOUND:
				break;
				case ST_IMAGE:
				break;
			}
			break;
		}
	}
}

console.log((new Date()) + " - Jeedom url : " + urlJeedom + ", gwAddress : " + gwAddress);

if (type == 'serial') {
	//pour la connexion avec Jeedom => Node
	var pathsocket = '/tmp/mysensor.sock';
	fs.unlink(pathsocket, function () {
		var server = net.createServer(function(c) {
			console.log((new Date()) + " - Server connected");
			c.on('error', function(e) {
				console.log((new Date()) + " - Error server disconnected");
			});
			c.on('close', function() {
				console.log((new Date()) + " - Connexion closed");
			});
			c.on('data', function(data) {
				console.log((new Date()) + " - Response: " + data);
				gw.write(data.toString() + '\n');
			});
		});
		server.listen(8019, function(e) {
			console.log((new Date()) + " - server bound on 8019");
		});
	});

	var com = require("serialport");
	gw = new com.SerialPort(gwAddress, {
		baudrate: 115200,
		parser: com.parsers.readline('\r\n')
	});
	//gw = new SerialPort(gwAddress, { baudrate: "115200" });
	gw.open();
	gw.on('open', function() {
		console.log((new Date()) + " - connected to serial gateway at " + gwAddress);
		saveGateway('1');
	}).on('data', function(rd) {
		appendData(rd.toString(), db, gw);
	}).on('end', function() {
		console.log((new Date()) + " - disconnected from serial gateway");
		saveGateway('0');
	}).on('error', function(error) {
		console.log((new Date()) + " - connection error - trying to reconnect: " + error);
		saveGateway('0');
		setTimeout(function() {gw.open();}, 5000);
	});
} else {
	gw = require('net').Socket();
	gw.connect(gwAddress, type);
	gw.setEncoding('ascii');
	gw.on('connect', function() {
		console.log((new Date()) + " - connected to network gateway at " + gwAddress + ":" + type);
		saveGateway('1');
	}).on('data', function(rd) {
		appendData(rd.toString(), db, gw);
	}).on('end', function() {
		console.log((new Date()) + " - disconnected from network gateway");
		saveGateway('0');
	}).on('error', function() {
		console.log((new Date()) + " - connection error - trying to reconnect");
		saveGateway('0');
		gw.connect(gwAddress, type);
		gw.setEncoding('ascii');
	});
}


process.on('uncaughtException', function ( err ) {
	console.log((new Date()) + " - An uncaughtException was found, the program will end");
	//process.exit(1);
});
