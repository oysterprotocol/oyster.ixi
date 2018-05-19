var iri = com.iota.iri;
var Callable = iri.service.CallableRequest;
var Response = iri.service.dto.IXIResponse;
var BinaryResponse = iri.service.dto.BinaryResponse;
var Error = iri.service.dto.ErrorResponse;
var Transaction = iri.controllers.TransactionViewModel;
var Address = iri.controllers.AddressViewModel;
var Converter = iri.utils.Converter;
var Hash = iri.model.Hash;

var Byte = Java.type('java.lang.Byte');
var LinkedList = Java.type('java.util.LinkedList');
var MessageDigest = Java.type('java.security.MessageDigest');
var Str = Java.type('java.lang.String');
var ByteBufferArray = Java.type('java.nio.ByteBuffer[]')
var ByteBuffer = Java.type('java.nio.ByteBuffer')
var ByteArray = Java.type('byte[]');

var STOPPER_TRYTE = 'A'

print("Oyster extension started... ");

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

function getHash(message, algorithm) {
  try {
    var buffer = message.getBytes();
    var md = MessageDigest.getInstance(algorithm);
    md.update(buffer);
    var digest = md.digest();
    var hex = "";
    for(var i = 0 ; i < digest.length ; i++) {
      hex = hex + Str.format("%02x", Byte.parseByte(digest[i]));
    }
    return hex;
  } catch(e) {
    e.printStackTrace();
  }
  return null;
}

function generateHashList(hash, count) {
  var hashList = new LinkedList()

  for(var i = 0 ; i < count; i++) {
    var obfuscatedHash = getHash(hash, 'SHA-384');
    hash = getHash(hash, 'SHA-256');
    hashList.add(obfuscatedHash)
  }

  return hashList
}

function trimSignature(signature) {
  return signature.substring(0, signature.lastIndexOf(STOPPER_TRYTE))
}

function binarySignatures(signatures) {
  var byteBuffers = new ByteBufferArray(signatures.length)
  var size = 0

  for (var i = 0; i < signatures.length; i++) {
    var signature = signatures[i]

    if(signature != null) {
      var trytes = trimSignature(signature)
      var length = trytes.length / 2
      var bytes = new ByteArray(2 + length)
      fromTrytes(trytes, bytes, 2)

      bytes[0] = (length >> 8) & 0xFF
      bytes[1] = length & 0xFF
      size += bytes.length

      byteBuffers[i] = ByteBuffer.wrap(bytes)
    }
  }

  return BinaryResponse.create(byteBuffers, size)
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
    var binary = request.get('binary')

    if (hash === null || count === null) {
      print('Request incomplete')
      return Error.create("Malformed or invalid input.");
    }

    var signatures = generateSignatures(hash, count)

    if(binary) {
      var signatureBytesResponse = binarySignatures(signatures);
      return signatureBytesResponse;
    } else {
      return Response.create({signatures: signatures});
    }
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
