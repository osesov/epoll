const BN = require('bn.js');

exports.decodeLog = function(web3, contract, logs, ev) {
    var r = null;
    if (Array.isArray(logs)) {
        r = logs.map(log => {
            const desc = _.find(contract._jsonInterface,
                o =>
                    o.type === "event"
                    && log.topics.includes(o.signature)
                    && (ev == null || ev.includes(o.name)));
            return desc ? web3.eth.abi.decodeLog(desc.inputs, log.data, log.topics.slice(1)) : null;
        }).filter( x=> x != null );
    }
    else if (logs != null) {
        const desc = _.find(contract._jsonInterface,
            o => o.type === "event" && logs.topics.includes(o.signature));
        r = desc ? web3.eth.abi.decodeLog(desc.inputs, log.data, log.topics.slice(1)) : null;
    }
    return r;
}

exports.addressToNumber = function(address) {
    if (!address)
        return null;

    return new BN(address.replace(/^0x/, ""), "hex")
}