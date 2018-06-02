var iri = com.iota.iri;
var Callable = iri.service.CallableRequest;
var Response = iri.service.dto.IXIResponse;
var Error = iri.service.dto.ErrorResponse;
var Transaction = iri.controllers.TransactionViewModel;
var Address = iri.controllers.AddressViewModel;
var Converter = iri.utils.Converter;
var Hash = iri.model.Hash;

var Byte = Java.type('java.lang.Byte');
var ByteArray = Java.type('byte[]');
var CharArray = Java.type('char[]');
var Integer = Java.type('java.lang.Integer');
var LinkedList = Java.type('java.util.LinkedList');
var MessageDigest = Java.type('java.security.MessageDigest');
var Str = Java.type('java.lang.String');
var StringBuilder = Java.type('java.lang.StringBuilder');

var STOPPER_TRYTE = 'A'

print("Oyster extension started... ");

function hexToBytes(hexString) {
  var b = new ByteArray(hexString.length / 2);

  for (var i = 0; i < b.length; i++) {
    var index = i * 2;
    var v = Integer.parseInt(hexString.substring(index, index + 2), 16);
    b[i] = v;
  }

  return b;
}

function bytesToHex(bytes) {
  var hexChars = new CharArray(bytes.length * 2);

  for (var j = 0; j < bytes.length; j++ ) {
      var v = bytes[j] & 0xFF;
      hexChars[j * 2] = HEX_ARRAY[v >>> 4];
      hexChars[j * 2 + 1] = HEX_ARRAY[v & 0x0F];
  }
  return new Str(hexChars);
}

function toTrytes(bytes) {
  var sb = new StringBuilder(80);

  for (var i = 0; i < bytes.length; i++) {
      var v = bytes[i] & 0xFF;
      var firstValue = v % 27;
      var secondValue = (v - firstValue) / 27;
      sb.append(Converter.TRYTE_ALPHABET.charAt(firstValue));
      sb.append(Converter.TRYTE_ALPHABET.charAt(secondValue));

      if(sb.length() >= 81) {
        break;
      }
  }
  return sb.toString();
}

function fromTrytes(trytes, bytes, offset) {
  if (trytes == null || (trytes.length % 2) != 0) {
    return null
  }

  for (var i = 0; i < trytes.length; i += 2) {
    var low = Converter.TRYTE_ALPHABET.indexOf(trytes[i]);
    var high = Converter.TRYTE_ALPHABET.indexOf(trytes[i + 1]);
    bytes[offset++] = low + high * 27;
  }

  return true;
}

function getHash(bytes, algorithm) {
  try {
    var md = MessageDigest.getInstance(algorithm);
    md.update(bytes);
    var digest = md.digest();
    return digest;
  } catch(e) {
    e.printStackTrace();
  }
  return null;
}

function generateHashList(hash, count) {
  var hashList = new LinkedList()
  var bytes = hexToBytes(hash)

  for(var i = 0 ; i < count; i++) {
    var obfuscatedHash = getHash(bytes, 'SHA-384');
    bytes = getHash(bytes, 'SHA-256');
    hashList.add(obfuscatedHash);
  }

  return hashList
}

function trimSignature(signature) {
  return signature.substring(0, signature.lastIndexOf(STOPPER_TRYTE))
}

function generateSignatures(hash, count) {
  var rawHashes = generateHashList(hash, count)

  var signatures = rawHashes.stream()
        .map(function (h) { return Converter.asciiToTrytes(h).substring(0, 81) })
        .map(getSignature)
        .toArray()

  return signatures
}

function findGeneratedSignatures(request) {
  try {
    var hash = request.get('hash')
    var count = request.get('count')

    if (hash === null || count === null) {
      print('Request incomplete')
      return Error.create("Malformed or invalid input.");
    }

    var signatures = generateSignatures(hash, count)

    return Response.create({signatures: signatures});
  } catch(e) {
    print(e)
    e.printStackTrace()

    return Error.create("Server side error");
  }
}

function getSignature(address) {
  return Address.load(IOTA.tangle, new Hash(address)).getHashes().stream()
      .map(function (h) { return Transaction.fromHash(IOTA.tangle, h) })
      .map(function (tx) { return Converter.trytes(tx.getSignature())})
      .findFirst().orElse(null);
}

function findSignatures(request) {
  var addresses = request.get("addresses");
  var signatures = null;

  if(addresses.stream) {
    signatures = addresses.stream().map(getSignature).toArray();
  }

  if (signatures === null || signatures.length === 0) {
    return Error.create("Malformed or invalid input.");
  }

  return Response.create({signatures: signatures});
}

API.put("findSignatures", new Callable({ call: findSignatures }));
API.put("findGeneratedSignatures", new Callable({ call: findGeneratedSignatures }));
