'use strict';

const bigInt = require('./BigInteger.js');

/**
 * RSA hash function reference implementation.
 * Uses BigInteger.js https://github.com/peterolson/BigInteger.js
 * Code originally based on https://github.com/kubrickology/Bitcoin-explained/blob/master/RSA.js
 */
const RSA = exports;

/**
 * Generates a k-bit RSA public/private key pair
 * https://en.wikipedia.org/wiki/RSA_(cryptosystem)#Code
 *
 * @param   {keysize} int, bitlength of desired RSA modulus n (should be even)
 * @returns {array} Result of RSA generation (object with three bigInt members: n, e, d)
 */
RSA.generate = function(keysize) {
  /**
   * Generates a random k-bit prime greater than √2 × 2^(k-1)
   *
   * @param   {bits} int, bitlength of desired prime
   * @returns {bigInt} a random generated prime
   */
  function randomPrime(bits) {
    const min = bigInt(6074001000).shiftLeft(bits - 33);  // min ≈ √2 × 2^(bits - 1)
    const max = bigInt.one.shiftLeft(bits).minus(1);  // max = 2^(bits) - 1
    for (;;) {
      const p = bigInt.randBetween(min, max);  // WARNING: not a cryptographically secure RNG!
      if (p.isProbablePrime(256)) {
        return p;
      }
    }
  }

  // set up variables for key generation
  const e = bigInt(65537);  // use fixed public exponent
  let p;
  let q;
  let lambda;

  // generate p and q such that λ(n) = lcm(p − 1, q − 1) is coprime with e and |p-q| >= 2^(keysize/2 - 100)
  do {
    p = randomPrime(keysize / 2);
    q = randomPrime(keysize / 2);
    lambda = bigInt.lcm(p.minus(1), q.minus(1));
  } while (bigInt.gcd(e, lambda).notEquals(1)
         || p.minus(q).abs().shiftRight(keysize / 2 - 100).isZero());

  return {
    n: p.multiply(q),  // public key (part I)
    e: e,  // public key (part II)
    d: e.modInv(lambda),  // private key d = e^(-1) mod λ(n)
  };
};

/**
 * Encrypt
 *
 * @param   {m} int / bigInt: the 'message' to be encoded
 * @param   {n} int / bigInt: n value returned from RSA.generate() aka public key (part I)
 * @param   {e} int / bigInt: e value returned from RSA.generate() aka public key (part II)
 * @returns {bigInt} encrypted message
 */
RSA.encrypt = function(m, n, e) {
  return bigInt(m).modPow(e, n);
};

/**
 * Decrypt
 *
 * @param   {c} int / bigInt: the 'message' to be decoded (encoded with RSA.encrypt())
 * @param   {d} int / bigInt: d value returned from RSA.generate() aka private key
 * @param   {n} int / bigInt: n value returned from RSA.generate() aka public key (part I)
 * @returns {bigInt} decrypted message
 */
RSA.decrypt = function(c, d, n) {
  return bigInt(c).modPow(d, n);
};

RSA.blind = function(m, key) {
    function randomPrime(bits) {
        const min = bigInt(6074001000).shiftLeft(bits - 33);  // min ≈ √2 × 2^(bits - 1)
        const max = bigInt.one.shiftLeft(bits).minus(1);  // max = 2^(bits) - 1
        for (;;) {
            const p = bigInt.randBetween(min, max);  // WARNING: not a cryptographically secure RNG!
            if (p.isProbablePrime(256))
                return p;
        }
    }

    let r;
    const keysize = key.n.bitLength()

    do {
      r = randomPrime(keysize / 2);
    } while (r.geq(key.n));

    const mul = r.modPow(key.e, key.n);

    return {
        r: r,
        rInv: null,
        m: bigInt(m).multiply(mul).mod(key.n)
    };
}

RSA.unblind = function(s, m, key) {
    if (m.rInv == null)
        m.rInv = m.r.modInv(key.n);

    return bigInt(s).multiply(m.rInv).mod(key.n);
}

RSA.sign = function(m, key) {
    return bigInt(m).modPow(key.d, key.n);
}

RSA.verify = function(s, m, key) {
    const x = bigInt(s).modPow(key.e, key.n)
    return bigInt(m).eq(x)
}
