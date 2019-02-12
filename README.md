# Electronic Poll via Ethereum Example

This is an example project on how to develop Ethereum smart-contract
and client.

Epoll project implements very simple voting system, with quite a few
of limitations, as opposed to regular voting system.

In particular, epoll demonstrates following properties:

1) Eligibility: weak. Anybody, who has ethereum account, and can
   access this system, can vote.  So voter might be non-relevant in
   general. This might be enforced by network organization, or might
   be addressed n the code itself.
   
2) Anonymity: pretty strong, unless the same account used for other
   purports.

3) Confidentiality: weak. Anybody can see other's choices, however
   there is no link to the person.

4) Vote falsification: strong. It's computationally unfeasible to cast
   a vote under other person's account, due to use state-of-art Public
   key cryptography.

5) Tamper proof: strong. It's computationally unfeasible to change
   data in the storage due to blockchain properties.


# Installation and usage

This scenario runs both ethereum node and client application in
localhost-only truffle debug environment.

ATTENTION: In order to run the demo node.js and npm should be
installed.

Truffle is a framework to write, debug, and test both ethereum
smart-contracts and applications, written in JavaScript.

```bash
### Check out git repository:
$ git clone git@github.com:osesov/epoll.git
$ cd epoll

### Install necessary components
$ npm install

### Run ganache: local ethereum client, used to test ethereum applications. 
$ ./node_modules/.bin/ganache-cli
Ganache CLI v6.3.0 (ganache-core: 2.4.0)

Available Accounts
....
Listening on 127.0.0.1:8545

### In another console, deploy smart contracts truffle
$ cd epoll
$ ./node_modules/.bin/truffle migrate

### and finally run e-vote test:
$ ./node_modules/.bin/truffle test

  Contract: epoll
CA: Create poll on 'How would like your eggs?'. Choices:
CA:     0) 'Sunny Side Up'
CA:     1) 'Over Easy'
CA:     2) 'Poached'
CA:     3) 'I don't care!'
CA: Poll address: 0xA810Ad443011483098c3cfd2701F8dF1B7FB4816
V1: voting from 0xdD1805BC74fAD79595E9094b4350b42b0073a427 for 2. outcome 0(accepted)
V2: voting from 0x137217e4fBa37ff77C384C50be8Eff1abAeee3a0 for 3. outcome 0(accepted)
V3: voting from 0xaE55d15B0054F513B8006668B33543714e0A2AAD for 2. outcome 0(accepted)
V4: voting from 0x671E1876A538f0261d58FF503B7236B49761173b for 2. outcome 0(accepted)
V5: voting from 0x6a7833CbcD3360cF9f79f4d5FEa6E778785d211B for 3. outcome 0(accepted)
V6: voting from 0xB3e3494f9287642026a024a3EE428aa16055E51b for 1. outcome 0(accepted)
V7: voting from 0xa612E6E61a298A5C90fBbE68D7A1Afa5b466DDfB for 0. outcome 0(accepted)
V8: voting from 0x16c5E4E127803b1Ed1e2633F9892Dfe3648940fa for 0. outcome 0(accepted)
V9: voting from 0x5c10685703357e3628F763f257A3FF7b47Ed0583 for 0. outcome 0(accepted)
CA: === Poll choice (3 votes) ===
CA:     0) 'Sunny Side Up'
CA:     2) 'Poached'
CA: --- Others ---
CA:     3) 'I don't care!': 2
CA:     1) 'Over Easy': 1
    ✓ vote (520ms)


  1 passing (531ms)

```

# Source code

Source code:

- `contracts/epoll.sol`: ethereum smart-contract code, written in
  solidity.

- `test/poll.js`: poll client module, written in JavaScript. This
  module consists of two classes: CA and VOTER.
  
  class `CA` implements Central Authority handling - the service,
  which creates a poll and is responsible for maintaining it.

  Methods provided:
  - startPoll: create a new poll.
  - endPoll: complete a poll, so it could not be voted any more
  - getResults: Read results from the poll.
  
  class `VOTER` implements voter functionality.
  - vote: cast a vote. Vote is accepted if this voter has made no
    choice yet and the casted vote is in a valid range.  All these
    limitations are enforces at blockchain side, in the smart
    contract. Finally vote emits event to the sender with the voting
    outcome (if it was accepted or not).
  - getResults: Read results from the poll.
   
- `test/utils.js`: some Ethereum utils, used in poll client
  implementation.

- `test/epoll.js`: truffle JavaScript test for the epoll
  smart-contract.
