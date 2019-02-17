const BN = require('bn.js');
const RSA = require("../lib/rsa.js")
const CA = require("../lib/ca.js")
const VOTER = require("../lib/voter.js")
const epoll = artifacts.require("epoll");

const ONE = new BN(1)

// Choices are:  `["BigNumber", "BN", "String"].
for (item in [epoll]) {
  item.numberFormat = 'BigNumber';
}


contract("epoll", accounts => {
  const pollSubject = "How would like your eggs?";
  const choices = ["Sunny Side Up", "Over Easy", "Poached", "I don't care!"]

//   async function deployPoll(subject, choices, key) {
//     if (key == null)
//       key = await RSA.generate(256);

//     return epoll.new(subject, choices.join(";"), key.e, key.n);
//   }

  it("ee", async () => {
    const ca = new CA(web3);
    await ca.connect();  
    await ca.closePoll();
    const instance = await ca.startPoll(pollSubject, choices);
    const expectResults = new Array(choices.length).fill(0);

    assert.isTrue( await ca.isActive());
    for(voterIndex = 0; voterIndex < 5; voterIndex++) {
      const voter = new VOTER(web3);
      await voter.connect(voterIndex);
      await voter.openPoll();
      const sigRequest = await voter.getSignatureRequest();
      const sigResult = await ca.signRequest(sigRequest);
      await voter.setSignature(sigResult);
      const cast = Math.floor(Math.random() * voter.choices.length);
      await voter.vote(cast);
      expectResults[cast] += 1;
    }

    const ix = expectResults.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0);
    const results = await ca.closePoll();

    assert.equal(ix, results.result);
  });

  it("rsa", async () => {
    const k = RSA.generate(256);
    // console.log("key: ", k)
    const M = RSA.randBetween(2, 1024*1024)
    // console.log("M: ", M)
    const X = RSA.blind(M, k)
    // console.log("blind: ", X)
    const S = RSA.sign(X.m, k)
    // console.log("sign: ", S)
    const U = RSA.unblind(S, X, k)
    // console.log("unblind: ", U)
    assert.isTrue(RSA.verify(U, M, k))
    assert.isTrue(RSA.verify(S, X.m, k))
  });

  // it("vote", async () => {
  //   const k = RSA.generate(256);
  //   const instance = await deployPoll(pollSubject, choices, k);
  //   const vote = RSA.randBetween(0, choices.length);

  //   const mainAddress = accounts[0];
  //   const voteAddress = accounts[1];
  //   const otherAddress = accounts[2];
  //   console.log("main addr:", mainAddress);
  //   console.log("vote addr:", voteAddress);

  //   const address = new BN(voteAddress.replace(/^0x/, ""), "hex");
  //   const blinded = RSA.blind(address, k);
  //   const bS = RSA.sign(blinded.m, k);
  //   const S = RSA.unblind(bS, blinded, k)

  //   // const x = await instance.sign.call(blinded.m, k.e);
  //   console.log("n: ", k.n.toString(10))
  //   console.log("m: ", address.toString(10))
  //   console.log("m': ", blinded.m.toString(10))
  //   // console.log("m': ", b1.toString(10))
  //   console.log("e: ", k.e.toString(10))

  //   // console.log("ct ", x.toString(10))
  //   console.log("lb1 ", S.toString(10))
  //   console.log("lb2 ", RSA.sign(address, k).toString(10))
  //   const r = await instance.modpow.call(S, k.e, k.n);
  //   console.log("contract: ", r.toString(16));
  //   assert.isTrue( RSA.verify(S, address, k) )

  //   // assert.isTrue(await instance.checkSignature.call(address, S))

  //   async function printLogs(x) {
  //     if (x instanceof Promise)
  //       x = await x;
      
  //       console.log('---')
  //       if (x.logs) {
  //         x.logs.forEach( (value, index) => {
  //           console.log("Event: %s", value.event);
  //           for (var p in value.args) {
  //             if (!isNaN(parseInt(p,10)))
  //               continue;
  //             if (p === '__length__')
  //               continue;

  //             var v = value.args[p].toString(16);
  //             console.log("\t%s: %s", p, v);
  //          }
  //       });
  //     }
  //     return x;
  //   }

  //   async function checkOutcome(expect, x) {
  //     x = await printLogs(x);
  //     x.logs.forEach((item) => {
  //       if (item.event === "Vote")
  //         assert.equal(item.args['outcome'].toNumber(), expect);
  //     });
  //   }

  //   checkOutcome( 1, await instance.vote(S, 0, {from: mainAddress}) )
  //   checkOutcome( 1, await instance.vote(S, 0, {from: otherAddress}) )
  //   checkOutcome( 2, await instance.vote(S, choices.length, {from: voteAddress}))
  //   checkOutcome( 0, await instance.vote(S, choices.length - 1, {from: voteAddress}) );
  //   checkOutcome( 4, await instance.vote(S, 0, {from: voteAddress}) );
  // });

});
