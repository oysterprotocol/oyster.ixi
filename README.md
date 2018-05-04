# Oyster.ixi

Provides an API Method `Oyster.findSignatures` that returns the signatures of the first* transaction associated with each given address.

This saves a roundtrip, the overhead of transmitting the whole transaction, as well as skipping any additional transactions `findTransactions` would return.

* - this needs some work

## Installation

Clone into IRI's ixi directory:

    git clone https://github.com/nullpilot/oyster.ixi.git Oyster

## Testing

    curl http://localhost:14265 -X POST \
      -H 'X-IOTA-API-Version: 1.4.1' -H 'Content-Type: application/json' \
      -d '{"command": "Oyster.findSignatures", "addresses": ["RCUCCBUCBBUCYAUAUA9BUCQCPCZARCBBYAPCCBQCWAYAPCUCCBUAZAUCUCUC9BXARC9BVAABTCUASCQCB"]}'
