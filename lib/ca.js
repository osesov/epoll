
const Web3 = require("web3");
const RSA = require("./rsa.js");
const UTILS = require("./utils.js")
const epollInfo = require("../build/contracts/epoll.json");
const keySize = 256;

exports = module.exports = function(web3) {
    this.web3 = web3 ? web3 : new Web3(
        new Web3.providers.HttpProvider("http://127.0.0.1:8545"),
    );
};

exports.prototype.connect = async function() {
    const web3 = this.web3;
    if (this.pollKey == null)
        this.pollKey = RSA.generate(keySize);

    const networkId = await web3.eth.net.getId();
    const deployedNetwork = epollInfo.networks[networkId];
    this.contract = new web3.eth.Contract(epollInfo.abi, deployedNetwork.address);
    this.epoll = this.contract.methods;

    // get accounts
    const accounts = await web3.eth.getAccounts();
    this.account = accounts[0];

    this.options = {from: this.account, gas:6000000};
};

exports.prototype.startPoll = async function(subj, choices) {
    const web3 = this.web3;

    this.pollKey = RSA.generate(keySize);
    const e = web3.utils.numberToHex(this.pollKey.e);
    const n = web3.utils.numberToHex(this.pollKey.n);

    var active = await this.epoll.isActive().call();
    if (active) {
        await this.epoll.closePoll().send(this.options);
        active = await this.epoll.isActive().call();
    }
    const method = this.epoll.startPoll(subj + ";" + choices.join(";"), e, n);
    const result = await method.send(this.options);
    const receipt = await web3.eth.getTransactionReceipt(result.transactionHash);

    // compiled is the built contract. address is the contract address
    const contract = this.contract; // new web3.eth.Contract(compiled.abi, address)
    return UTILS.decodeLog(this.web3, contract, receipt.logs).shift().pollId;
};

exports.prototype.closePoll = async function() {
    var active = await this.epoll.isActive().call();
    if (active) {
        const result = await this.epoll.closePoll().send(this.options);
        const receipt = await web3.eth.getTransactionReceipt(result.transactionHash);
        const ev = UTILS.decodeLog(this.web3, this.contract, receipt.logs);
        const e = ev.shift();
        return {
            pollId: e.pollId,
            result: e.result,
            subject: e.pollInfo
        }
    }
    else
        return null;
};

exports.prototype.signRequest = function(secret) {
    return RSA.sign(secret, this.pollKey).toString(10);
};

exports.prototype.getPollId = function() {
    return this.epoll.pollId().call();
}

exports.prototype.isActive = async function() {
    return this.epoll.isActive().call();
}
