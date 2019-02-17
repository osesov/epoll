'use strict';
const BN = require('bn.js');
const bigInt = require('big-integer')

const ONE = new BN(1)

function modinv(x,n) {
  return new BN(x).invm(n);
}

function modmul(x,y,n) {
  const nred = BN.red(n);
  return new BN(x).toRed(nred).redMul(y.toRed(nred)).fromRed();
}

function modpow(x,y,n) {
  const nred = BN.red(n);
  const r = new BN(x).toRed(nred).redPow(y).fromRed();
  // console.log("modpow:\n\t%s\n\t^ %s\n\tmod %s\n\t= %s\n\t=%s", x.toString(10), y.toString(10), n.toString(10), r.toString(10));
  return r;
}

function lcm(a,b) {
  a = new BN(a).abs();
  b = new BN(b).abs();
  const c = a.gcd(b)
  return a.div(c).mul(b);
}

function randomPrime(bits) {
  const min = bigInt(6074001000).shiftLeft(bits - 33);  // min ≈ √2 × 2^(bits - 1)
  const max = bigInt.one.shiftLeft(bits).minus(1);  // max = 2^(bits) - 1
  for (;;) {
    const p = bigInt.randBetween(min, max);  // WARNING: not a cryptographically secure RNG!
    if (p.isProbablePrime(256)) {
      return new BN(p.toString(10));
    }
  }
}

exports.randBetween = function (min, max) {
  const p = bigInt.randBetween(min, max);  // WARNING: not a cryptographically secure RNG!
  return new BN(p.toString(10));
}

exports.generate = function(keysize) {
  const e = new BN(65537);  // use fixed public exponent
  let p;
  let q;
  let lambda;

  // generate p and q such that λ(n) = lcm(p − 1, q − 1) is coprime with e and |p-q| >= 2^(keysize/2 - 100)
  do {
    p = randomPrime(keysize / 2);
    q = randomPrime(keysize / 2);
    lambda = lcm(p.sub(ONE), q.sub(ONE));
  } while (e.gcd(lambda).cmp(ONE) != 0
         || p.sub(q).abs().shrn(keysize / 2 - 100).isZero());

  return {
    n: p.mul(q),  // public key (part I)
    e: e,  // public key (part II)
    d: e.invm(lambda),  // private key d = e^(-1) mod λ(n)
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
exports.encrypt = function(m, n, e) {
  m = new BN(m)
  e = new BN(e)
  n = new BN(n)
  return modpow(m, e, n)
  // return await openpgp.encrypt(m, n, e)
};

/**
 * Decrypt
 *
 * @param   {c} int / bigInt: the 'message' to be decoded (encoded with RSA.encrypt())
 * @param   {d} int / bigInt: d value returned from RSA.generate() aka private key
 * @param   {n} int / bigInt: n value returned from RSA.generate() aka public key (part I)
 * @returns {bigInt} decrypted message
 */
exports.decrypt = function(c, d, n) {
  c = new BN(c)
  d = new BN(d)
  n = new BN(n)
  return modpow(c,d,n)
  // return bigInt(c).modPow(d, n);
};

exports.blind = function(M, KEY) {
  const m = new BN(M)
  const n = new BN(KEY.n)
  const e = new BN(KEY.e)

  let r;
  const keysize = Math.pow(2, Math.ceil(Math.log(n.bitLength())/Math.log(2)));
  // const keysize = (key.n.bitLength() + 255) / 256 * 256

  do {
    r = randomPrime(keysize / 2);
  } while (r.gte(n));

  const mul = modpow(r, e, n)

  return {
      r: modinv(r, n),
      m: modmul(m, mul, n)
  };
}

exports.unblind = function(s, m, key) {
  s = new BN(s)
  const n = new BN(key.n)
  return modmul(s, m.r, n);
}

exports.sign = function(M, KEY) {
  const m = new BN(M)
  const d = new BN(KEY.d)
  const n = new BN(KEY.n)
  return modpow(m, d, n);
}

exports.verify = function(s, m, key) {
  s = new BN(s)
  m = new BN(m)
  const e = new BN(key.e)
  const n = new BN(key.n)

  const x = modpow(s, e, n)
  return x.eq(m)
}
