const BN = require('./bn.js');
const RSA = require("./rsa.js")
const bigInt = require('./BigInteger.js');
const pf = artifacts.require("epollFactory");
const epoll = artifacts.require("epoll");

// Choices are:  `["BigNumber", "BN", "String"].
epoll.numberFormat = 'BN';

contract("epollFactory", accounts => {
  const pollSubject = "Poll of something?";
  const choices = ["yes", "no"]

  function toEthNumber(n) {
    return "0x" + n.toString(16)
  }

  function fromEthNumber(n) {
    return new BN(n.replace("0x", ""), 16).toString(10);
  }

  function deployPoll(subject, choices, key) {
    if (key == null)
      key = RSA.generate(256);

    return epoll.new(subject, choices.join(";"),
      toEthNumber(key.e),
      toEthNumber(key.n));
  }

  it("red", async () => {
    const n = new BN(101)
    const a = new BN(65537);
    const b = new BN(123);
    const red = BN.red(n);
  
    const c = b.toRed(red).redPow(a).fromRed();
    assert.equal(c.cmp(new BN(49)), 0);
    console.log(c.toString())
  });
  
  it("poll initializing", async () => {
    const instance = await deployPoll(pollSubject, choices);

    // console.log("xx: ", instance);
    const subject = await instance.subject();
    assert.equal(subject, pollSubject, "Check poll subject")
    const numberOfChoices = (await instance.getNumberOfChoices.call()).toNumber();

    assert.equal(numberOfChoices, choices.length, "Valid number of choices")
    
    for (let [i,v] of choices.entries()) {
      const x = await instance.choices(i)
      assert.equal(x, v)
      // console.log("%s: %s <-> %s", i, v, x)
    }
  });

  it("rsa", async () => {
    // console.log(assert)
    const k = RSA.generate(256);
    // console.log("key: ", k)
    const M = bigInt.randBetween(2, 1024*1024)
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

  it("vote", async () => {
    const k = RSA.generate(256);
    const instance = await deployPoll(pollSubject, choices, k);
    const vote = bigInt.randBetween(0, choices.length);

    const a = web3.eth.accounts.create()
    const address = fromEthNumber(a.address)
    console.log("acc: ", a.address, address);
    const blinded = RSA.blind(address, k);
    const b1 = await instance.blind.call(a.address, toEthNumber(blinded.r))
    const bS = RSA.sign(blinded.m, k);
    const S = RSA.unblind(bS, blinded, k)

    const x = await instance.sign.call(toEthNumber(blinded.m), toEthNumber(k.e));
    console.log("n: ", k.n.toString(10))
    console.log("m: ", fromEthNumber(a.address))
    console.log("m': ", blinded.m.toString(10))
    console.log("m': ", b1.toString(10))
    console.log("e: ", k.e.toString(10))

    console.log("ct ", x.toString(10))
    console.log("lb1 ", S.toString(10))
    console.log("lb2 ", RSA.sign(address, k).toString(10))
    assert.isTrue( RSA.verify(S, address, k) )
    assert.isTrue(await instance.checkSignature.call(a.address, toEthNumber(S)))

    // // console.log(assert)
    // const k = RSA.generate(256);
    // // console.log("key: ", k)
    // const M = bigInt.randBetween(2, 1024*1024)
    // // console.log("M: ", M)
    // const X = RSA.blind(M, k)
    // // console.log("blind: ", X)
    // const S = RSA.sign(X.m, k)
    // // console.log("sign: ", S)
    // const U = RSA.unblind(S, X, k)
    // // console.log("unblind: ", U)
    // assert.isTrue(RSA.verify(U, M, k))
    // assert.isTrue(RSA.verify(S, X.m, k))
  });

});
