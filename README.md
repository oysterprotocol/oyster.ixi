# Oyster.ixi

Provides an API method `Oyster.findSignatures` that returns the signatures of the first* transaction associated with each given address.

This saves a roundtrip, the overhead of transmitting the whole transaction, as well as skipping any additional transactions `findTransactions` would return.

Additionally provides a more recent method `Oyster.findGeneratedSignatures`. This approach moves part of the datamap generation from the client to the server, easing the load on the clients upstream during download. Suggestions for a better method name welcome.

\* \- this needs some work

## Installation

Clone into IRI's ixi directory:

    git clone https://github.com/nullpilot/oyster.ixi.git Oyster

## Testing

    curl http://localhost:14265 -X POST \
      -H 'X-IOTA-API-Version: 1.4.1' -H 'Content-Type: application/json' \
      -d '{"command": "Oyster.findSignatures", "addresses": ["RCUCCBUCBBUCYAUAUA9BUCQCPCZARCBBYAPCCBQCWAYAPCUCCBUAZAUCUCUC9BXARC9BVAABTCUASCQCB"]}'

    curl http://localhost:14265 -X POST \
      -H 'X-IOTA-API-Version: 1.4.1' -H 'Content-Type: application/json' \
      -d '{"command": "Oyster.findGeneratedSignatures", "hash": "dc948e9a95668139a41abe3b9ae07dc62736fa48493404b9f6a75402f6488ea5", "count": 3}'
