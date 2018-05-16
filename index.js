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
var ByteArrayOutputStream = Java.type('java.io.ByteArrayOutputStream');
var ByteArray = Java.type('byte[]');

print("Oyster extension started... ");

function fromTrytes(trytes) {
  if (trytes == null || (trytes.length % 2) != 0) {
    return null
  }

  var bytes = new ByteArray(trytes.length / 2)

  for (var i = 0, offset = 0; i < trytes.length; i += 2) {
    var low = Converter.TRYTE_ALPHABET.indexOf(trytes[i]);
    var high = Converter.TRYTE_ALPHABET.indexOf(trytes[i + 1]);
    bytes[offset++] = low + high * 27;
  }

  return bytes;
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
  var i = signature.length() - 1;

  while(i >= 0 && signature.charAt(i) == '9') {
    i--
  }

  // keep one more tryte if length (i+1) is uneven
  if(i % 2 == 0) {
    i++;
  }

  return signature.substring(0, i + 1)
}

function binarySignatures(signatures) {
  var byteStream = new ByteArrayOutputStream();

  for (var i in signatures) {
    var signature = signatures[i];

    if(signature != null) {
      var trytes = trimSignature(signature);
      var bytes = fromTrytes(trytes);

      // 2 bytes length + payload
      byteStream.write((bytes.length >> 8) & 0xFF);
      byteStream.write(bytes.length & 0xFF);
      byteStream.write(bytes);
    }
  }

  return byteStream.toByteArray();
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
      var signatureBuffer = binarySignatures(signatures)
      return BinaryResponse.create(signatureBuffer)
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
