const web3 = require("web3");
const RSA = require("./rsa.js");
const UTILS = require("./utils.js")
const epollInfo = require("../build/contracts/epoll.json");

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

exports = module.exports = function(web3) {
    this.web3 = web3 ? web3 : new Web3(
        new Web3.providers.HttpProvider("http://127.0.0.1:8545"),
    );
};

exports.prototype.connect = async function(voterIndex) {
    voterIndex = voterIndex || 0;
    const web3 = this.web3;
    const networkId = await web3.eth.net.getId();

    // get accounts
    const accounts = await web3.eth.getAccounts();
    this.votingAddress = accounts[1 + voterIndex];
    this.options = {from: this.votingAddress, gas:6000000};

    // contract
    const deployedNetwork = epollInfo.networks[networkId];
    this.contract = new web3.eth.Contract(
        epollInfo.abi,
        deployedNetwork.address,
        this.options);
    this.epoll = this.contract.methods;
};

exports.prototype.openPoll = async function() {

    const pollId = await this.epoll.pollId().call();
    const choices = [];
    var nChoices = await this.epoll.getNumberOfChoices().call();
    for (var j = 0; j < nChoices; ++j) {
        const c = await this.epoll.choices(j).call();
        choices.push(c);
    }

    this.poll = {
        pollId: pollId,

        isActive: await this.epoll.isActive().call(),
        subject: await this.epoll.subject().call(),
        choices: choices,

        startTime: await this.epoll.startTime().call(),
        endTime: await this.epoll.endTime().call(),
        pubKey: {
            e: await this.epoll.e().call(),
            n: await this.epoll.n().call()
        }
    }

    this.choices = choices;
}

exports.prototype.getSignatureRequest = async function() {
    const signAddress = UTILS.addressToNumber(this.votingAddress)
    this.blindRequest = RSA.blind(signAddress, this.poll.pubKey);
    return this.blindRequest.m.toString(10);
}

exports.prototype.setSignature = async function(sig) {
    this.signature = RSA.unblind(sig, this.blindRequest, this.poll.pubKey)
    const x = RSA.verify(this.signature, this.votingAddress, this.poll.pubKey);
}

exports.prototype.vote = async function(choice_) {
    const web3 = this.web3;
    const signature = web3.utils.numberToHex(this.signature);
    const choice = web3.utils.numberToHex(choice_);
    const method = await this.epoll.vote(signature, choice, this.poll.pollId)
    const result = await method.send(this.options)
    const receipt = await web3.eth.getTransactionReceipt(result.transactionHash);
    const ev = UTILS.decodeLog(this.web3, this.contract,
        receipt.logs, ["Vote"]);

    return ev.shift().outcome;
}
