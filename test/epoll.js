const BN = require('bn.js');
const POLL = require("../lib/poll.js")
const Web3 = require("web3");

web3 = new Web3( new Web3.providers.HttpProvider("http://127.0.0.1:8545") );

contract("epoll", accounts => {
  const pollSubject = "How would like your eggs?";
  const choices = ["Sunny Side Up", "Over Easy", "Poached", "I don't care!"]

  it("vote", async () => {
    const accounts = await web3.eth.getAccounts();
    const poll = new POLL(web3)

    console.info("CA: Create poll on '%s'. Choices:", pollSubject);
    choices.forEach( (e, i)=>{ console.info("CA:\t%s) '%s'", i, e); });
    const ca = await poll.CA(accounts[0]);
    const instance = await ca.startPoll(pollSubject, choices);
    console.info("CA: Poll address: %s", instance);
    for(voterIndex = 1; voterIndex < accounts.length; voterIndex++) {
      const voterAddress = accounts[voterIndex];
      const choice = Math.floor(Math.random() * choices.length);

      var voter = await poll.VOTER(voterAddress, instance);
      const outcome = await voter.vote(choice);
      console.info("V%s: voting from %s for %s. outcome %s(%s)", voterIndex, voterAddress, choice, outcome, outcome == 0 ? "accepted" : "rejected");
    }

    const closed = await ca.endPoll(instance)
    const result = await ca.getResults(instance);
    const best = result.results[0].count;
    console.info("CA: === Poll choice (%d votes) ===", best);
    for (i = 0; i < choices.length && result.results[i].count == best; ++i) {
      console.info("CA:\t%d) '%s'", result.results[i].choice, choices[result.results[i].choice] );
    }
    console.info("CA: --- Others ---");
    for (; i < choices.length; ++i) {
      console.info("CA:\t%d) '%s': %d", result.results[i].choice, choices[result.results[i].choice], result.results[i].count );
    }
  });

});
