
const Web3 = require("web3");
const UTILS = require("./utils.js")
const pollInfo = require("../build/contracts/epoll.json");

exports = module.exports = function(web3) {
    this.web3 = web3 ? web3 : new Web3(
        new Web3.providers.HttpProvider("http://127.0.0.1:8545"),
    );
};

function toDecimal(web3, value) {
    return web3.utils.toDecimal(value);
}

function toHex(web3, value) {
    return web3.utils.numberToHex(value);
}

///////////////////////////////////////////////////////////////////////
async function startPoll(web3, subj, choices, options) {
    const contract = new web3.eth.Contract(pollInfo.abi);
    
    var instance = await contract.deploy({
        arguments: [subj + ";" + choices.join(";")],
        data: pollInfo.bytecode
    }).send(options);
    
    return instance._address;
}

async function endPoll(web3, address, options) {
    const contract = new web3.eth.Contract(pollInfo.abi, address);
    const methods = contract.methods;

    var active = await methods.isActive().call();
    if (active) {
        const result = await methods.closePoll().send(options);
        const receipt = await web3.eth.getTransactionReceipt(result.transactionHash);
        const ev = UTILS.decodeLog(web3, contract, receipt.logs);
        const e = ev.shift();
        return { pollId: e.pollId }
    }
    else
        return null;
}

async function castVote(web3, address, choice_, options) {
    const contract = new web3.eth.Contract(pollInfo.abi, address);
    const methods = contract.methods;
    const choice = toHex(web3, choice_);
    const method = await methods.vote(choice)
    const result = await method.send(options)
    const receipt = await web3.eth.getTransactionReceipt(result.transactionHash);
    const ev = UTILS.decodeLog(web3, contract,
            receipt.logs, ["Vote"]);
    
    return ev.shift().outcome;
}

async function getPollResults(web3, address) {
    const contract = new web3.eth.Contract(pollInfo.abi, address);
    const methods = contract.methods;
    const n = toDecimal(web3, await methods.getNumberOfChoices().call());
    const results = new Array(n);
    const startTime = toDecimal(web3, await methods.startTime().call());
    const endTime = toDecimal(web3, await methods.endTime().call());
    var index;

    var active = await methods.isActive().call();

    for (index = 0; index < n; ++index) {
        const r = await methods.getResult(index).call();
        const value = toDecimal(web3, r);

        for (j = index - 1; j >= 0 && results[j].count < value; --j) {
            results[j + 1] = results[j];
        }
        results[j + 1] = {
            count: value,
            choice: index
        };
    }

    return {
        active: active,
        results: results,
        startTime: new Date(startTime*1000),
        endTime: new Date(endTime*1000)
    };
}


///////////////////////////////////////////////////////////////////////
function CA(web3, account, networkId) {
    this.web3 = web3;
    this.networkId = networkId;
    this.account = account;
    this.options = {from: this.account, gas:6000000};
}

CA.prototype.startPoll = async function(subj, choices) {
    return startPoll(this.web3, subj, choices, this.options);
};

CA.prototype.endPoll = function(pollAddress) {
    return endPoll(this.web3, pollAddress, this.options);
}

CA.prototype.getResults = async function(pollAddress) {
    return getPollResults(this.web3, pollAddress);
}

function VOTER(web3, account, address) {
    this.web3 = web3;
    this.address = address;
    this.contract = new web3.eth.Contract(pollInfo.abi, address);
    this.methods = this.contract.methods;
    this.account = account;
    this.options = {from: this.account, gas:6000000};
}

VOTER.prototype.vote = async function(choice_) {
    return castVote(this.web3, this.address, choice_, this.options);
}

VOTER.prototype.getResults = async function() {
    return getPollResults(this.web3, this.address);
}

exports.prototype.CA = function (account) {
    return new Promise(async(resolve) => {
        const networkId = await web3.eth.net.getId();
        resolve( new CA(web3, account, networkId) );
    });
}

exports.prototype.VOTER = function (account, address) {
    return new Promise(async(resolve) => {
        const networkId = await web3.eth.net.getId();
        resolve( new VOTER(web3, account, address) );
    });
}
