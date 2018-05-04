var iri = com.iota.iri;
var Callable = iri.service.CallableRequest;
var Response = iri.service.dto.IXIResponse;
var Error = iri.service.dto.ErrorResponse;
var Transaction = iri.controllers.TransactionViewModel;
var Address = iri.controllers.AddressViewModel;
var Converter = iri.utils.Converter;
var Hash = iri.model.Hash;

var Byte = Java.type('java.lang.Byte');
var LinkedList = Java.type('java.util.LinkedList');
var MessageDigest = Java.type('java.security.MessageDigest');
var Str = Java.type('java.lang.String');

print("Oyster extension started... ");

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
    print(obfuscatedHash)
  }

  return hashList
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
