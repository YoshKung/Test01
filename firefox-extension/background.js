const SSDP_ADDRESS = '239.255.255.250';
const SSDP_PORT = 1900;
const SEARCH_TARGET = 'urn:schemas-upnp-org:device:MediaRenderer:1';

let currentDevice = null;
let controlURL = null;

function stringToUint8Array(str) {
  const encoder = new TextEncoder();
  return encoder.encode(str).buffer;
}

function parseHeaders(response) {
  const lines = response.split(/\r?\n/);
  const headers = {};
  lines.forEach(line => {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const key = line.substring(0, idx).trim().toUpperCase();
      const value = line.substring(idx + 1).trim();
      headers[key] = value;
    }
  });
  return headers;
}

async function discoverDevice() {
  return new Promise((resolve, reject) => {
    chrome.sockets.udp.create({}, createInfo => {
      const socketId = createInfo.socketId;
      chrome.sockets.udp.bind(socketId, '0.0.0.0', 0, result => {
        if (result < 0) {
          reject('UDP bind failed');
          return;
        }
        const request =
          'M-SEARCH * HTTP/1.1\r\n' +
          'HOST: ' + SSDP_ADDRESS + ':' + SSDP_PORT + '\r\n' +
          'MAN: "ssdp:discover"\r\n' +
          'MX: 2\r\n' +
          'ST: ' + SEARCH_TARGET + '\r\n\r\n';
        const data = stringToUint8Array(request);
        chrome.sockets.udp.send(socketId, data, SSDP_ADDRESS, SSDP_PORT, () => {});

        const onReceive = info => {
          if (info.socketId !== socketId) return;
          const msg = new TextDecoder().decode(info.data);
          const headers = parseHeaders(msg);
          if (headers.LOCATION) {
            chrome.sockets.udp.onReceive.removeListener(onReceive);
            chrome.sockets.udp.close(socketId);
            resolve(headers.LOCATION);
          }
        };
        chrome.sockets.udp.onReceive.addListener(onReceive);
        setTimeout(() => {
          chrome.sockets.udp.onReceive.removeListener(onReceive);
          chrome.sockets.udp.close(socketId);
          reject('SSDP discovery timeout');
        }, 5000);
      });
    });
  });
}

async function fetchDeviceDescription(url) {
  const res = await fetch(url);
  const text = await res.text();
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, 'text/xml');
  const service = xml.querySelector('serviceType:contains("AVTransport")');
  // fallback manual search
  let control = null;
  xml.querySelectorAll('service').forEach(svc => {
    const type = svc.querySelector('serviceType');
    if (type && type.textContent.includes('AVTransport')) {
      control = svc.querySelector('controlURL').textContent;
    }
  });
  if (!control) throw new Error('No AVTransport service');
  const base = new URL(url);
  controlURL = new URL(control, base).toString();
}

async function setAVTransportURI(mediaUrl) {
  const body =
    '<?xml version="1.0" encoding="utf-8"?>' +
    '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">' +
    '<s:Body>' +
    '<u:SetAVTransportURI xmlns:u="urn:schemas-upnp-org:service:AVTransport:1">' +
    '<InstanceID>0</InstanceID>' +
    '<CurrentURI>' + mediaUrl + '</CurrentURI>' +
    '<CurrentURIMetaData></CurrentURIMetaData>' +
    '</u:SetAVTransportURI>' +
    '</s:Body>' +
    '</s:Envelope>';
  await fetch(controlURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset="utf-8"',
      SOAPAction: '"urn:schemas-upnp-org:service:AVTransport:1#SetAVTransportURI"'
    },
    body
  });
}

async function sendSimpleAction(action) {
  const body =
    '<?xml version="1.0" encoding="utf-8"?>' +
    '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">' +
    '<s:Body>' +
    `<u:${action} xmlns:u="urn:schemas-upnp-org:service:AVTransport:1">` +
    '<InstanceID>0</InstanceID>' +
    (action === 'Play' ? '<Speed>1</Speed>' : '') +
    `</u:${action}>` +
    '</s:Body>' +
    '</s:Envelope>';
  await fetch(controlURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset="utf-8"',
      SOAPAction: `"urn:schemas-upnp-org:service:AVTransport:1#${action}"`
    },
    body
  });
}

browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'CAST') {
    try {
      const location = await discoverDevice();
      await fetchDeviceDescription(location);
      await setAVTransportURI(message.url);
      await sendSimpleAction('Play');
      sendResponse({success: true});
    } catch (e) {
      console.error(e);
      sendResponse({success: false, error: e.toString()});
    }
    return true;
  } else if (message.type === 'PAUSE') {
    sendSimpleAction('Pause');
  } else if (message.type === 'PLAY') {
    sendSimpleAction('Play');
  } else if (message.type === 'STOP') {
    sendSimpleAction('Stop');
  }
});
