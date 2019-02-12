
const Web3 = require("web3");
const UTILS = require("./utils.js");
const pollInfo = require("../build/contracts/epoll.json");

exports = module.exports = function(web3) {
    if (!web3)
        console.error("web3 object is empty")
    this.web3 = web3;
};

function toDecimal(web3, value) {
    return web3.utils.toDecimal(value);
}

function toHex(web3, value) {
    return web3.utils.numberToHex(value);
}

///////////////////////////////////////////////////////////////////////
// Core epoll functions
///////////////////////////////////////////////////////////////////////

// Initiate a new poll.
// - web3: web3 object.
// - subj: Poll subject.
// - choices: array of choices.
// - options: Ethereum tx send options.
// Returns poll address, which can be passed to the following method calls
async function startPoll(web3, subj, choices, options) {
    const contract = new web3.eth.Contract(pollInfo.abi);
    var instance = await contract.deploy({
        arguments: [subj + ";" + choices.join(";")],
        data: pollInfo.bytecode
    }).send(options);
    return instance.address;
}

// Complete a poll. No votes would be accepted since then.
// - address: Poll address, returned fom startPoll
// - options: Ethereum tx send options.
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

// Cast a vote on the poll. Vote would be validated and accepted only if
// the choice is in the valid range abd the voter has not voted yet.
// - address: Poll address, returned fom startPoll
// - choice: choice for the poll
// - options: Ethereum tx send options.

async function castVote(web3, address, choice_, options) {
    const contract = new web3.eth.Contract(pollInfo.abi, address);
    const methods = contract.methods;
    const choice = toHex(web3, choice_);
    const method = await methods.vote(choice);
    const result = await method.send(options);
    const receipt = await web3.eth.getTransactionReceipt(result.transactionHash);
    const ev = UTILS.decodeLog(web3, contract,
            receipt.logs, ["Vote"]);
    
    return ev.shift().outcome;
}

async function getPollInfo(web3, address) {
    const contract = new web3.eth.Contract(pollInfo.abi, address);
    const methods = contract.methods;
    const n = toDecimal(web3, await methods.getNumberOfChoices().call());
    const choices = new Array(n);
    const startTime = toDecimal(web3, await methods.startTime().call());
    const endTime = toDecimal(web3, await methods.endTime().call());
    var index;

    var active = await methods.isActive().call();

    for (index = 0; index < n; ++index) {
        const value = await methods.getChoice(index).call();
        choices[index] = value;
    }

    return {
        active: active,
        subject: await methods.subject().call(),
        choices: choices,
        startTime: new Date(startTime*1000),
        endTime: new Date(endTime*1000)
    };    
}

// Obtain poll results.
// - address: Poll address, returned fom startPoll
// Returns: counted poll choices ordered by number of votes.
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
        const text = await methods.getChoice(index).call();
        const r = await methods.getResult(index).call();
        const value = toDecimal(web3, r);

        for (j = index - 1; j >= 0 && results[j].count < value; --j) {
            results[j + 1] = results[j];
        }
        results[j + 1] = {
            count: value,
            choice: index,
            text: text
        };
    }

    return {
        active: active,
        results: results,
        startTime: new Date(startTime*1000),
        endTime: new Date(endTime*1000)
    };
}


function onNewBlock( web3, callback ) {
    web3.eth.subscribe('newBlockHeaders', function(error, result) {
        if (!error) {
            callback(result);
            return;
        }
        console.error(error);
    })
    .on("data", function(blockHeader){
        web3.eth
            .getBlock(blockHeader.number, true)
            .then((block) => callback(block))
        // callback(blockHeader);
        // console.log("onNewBlock:data:", blockHeader);
    })
    .on("error", function(error) { console.error("onNewBlock:error:", error) });
}

function onNewPoll( web3, callback ) {
    const contract = new web3.eth.Contract(pollInfo.abi);
    web3.eth.subscribe('logs', {
        topics: [contract.jsonInterface.getEvent("PollStart").signature]
    }, (error, result) => {
        if (!error)
            console.log(result);
        else
            console.error(error);
    })
    .on("data", (log) => {
        console.log(log);
        callback(log.address);
    })
    .on("changed", (log) => {
        console.log(log);
    });
}

function onEndPoll( web3, callback ) {
    const contract = new web3.eth.Contract(pollInfo.abi);
    web3.eth.subscribe('logs', {
        topics: [contract.jsonInterface.getEvent("PollClose").signature]
    }, (error, result) => {
        if (!error)
            console.log(result);
        else
            console.error(error);
    })
    .on("data", (log) => {
        console.log(log);
        callback(log.address);
    })
    .on("changed", (log) => {
        console.log(log);
    });
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
};

CA.prototype.getResults = async function(pollAddress) {
    return getPollResults(this.web3, pollAddress);
};

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
};

VOTER.prototype.getResults = async function() {
    return getPollResults(this.web3, this.address);
};

VOTER.prototype.getPollInfo = async function() {
    return getPollInfo(this.web3, this.address);
};

exports.prototype.CA = function (account) {
    return new Promise(async(resolve) => {
        const networkId = await this.web3.eth.net.getId();
        resolve( new CA(this.web3, account, networkId) );
    });
};

exports.prototype.VOTER = function (account, address) {
    return new Promise(async(resolve) => {
        resolve( new VOTER(this.web3, account, address) );
    });
};

exports.prototype.onNewBlock = function(callback) {
    return onNewBlock(this.web3, callback);
};

exports.prototype.onNewPoll = function(callback) {
    return onNewPoll(this.web3, callback);
}

exports.prototype.onEndPoll = function(callback) {
    return onEndPoll(this.web3, callback);
}

exports.prototype.getResults = async function(pollAddress) {
    return getPollResults(this.web3, pollAddress);
};
