
const web3 = require("web3");
const RSA = require("./rsa.js");
const epoll = require("../build/contracts/epoll");
const epollFactory = require("../build/contracts/epollFactory");

const keySize = 256;

let pollKey = null;

exports.startPoll = async function(subj, choices) {
    if (pollKey == null)
        pollKey = RSA.generate(keySize);

    const networkId = await web3.eth.net.getId();
    const deployedNetwork = epoll.networks[networkId];
    this.meta = new web3.eth.Contract(
        epollFactory.abi,
        deployedNetwork.address,
    );

    // get accounts
    const accounts = await web3.eth.getAccounts();
    this.account = accounts[0];
};

exports.closePoll = function(pollAddress) {

};

exports.registerVoter = function(address, secret) {
    // todo: check is address is valid
    return RSA.sign(secret, pollKey)
};
