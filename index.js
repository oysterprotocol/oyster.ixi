var iri = com.iota.iri;
var Callable = iri.service.CallableRequest;
var Response = iri.service.dto.IXIResponse;
var Error = iri.service.dto.ErrorResponse;
var Transaction = iri.controllers.TransactionViewModel;
var Address = iri.controllers.AddressViewModel;
var Converter = iri.utils.Converter;
var Hash = iri.model.Hash;

print("Oyster extension started... ");

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
