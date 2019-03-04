const BN = require('bn.js');
const POLL = require("../lib/poll.js")

contract("epoll", accounts => {
  const pollSubject = "How would like your eggs?";
  const choices = ["Sunny Side Up", "Over Easy", "Poached", "I don't care!"]

  it("vote", async () => {
    const accounts = await web3.eth.getAccounts();
    const poll = new POLL(web3)

    const ca = await poll.CA(accounts[0]);
    const instance = await ca.startPoll(pollSubject, choices);
    console.info("Created poll: %s", instance);
    for(voterIndex = 1; voterIndex < accounts.length; voterIndex++) {
      const voterAddress = accounts[voterIndex];
      const choice = voterIndex % choices.length;

      console.debug("voting %s(%s): %s", voterIndex, voterAddress, choice);
      var voter = await poll.VOTER(voterAddress, instance);
      const outcome = await voter.vote(choice);
      console.info("voting %s(%s): %s => %s", voterIndex, voterAddress, choice, outcome);
    }

    const closed = await ca.endPoll(instance)
    const result = await ca.getResults(instance);
    console.info("Poll: %s", JSON.stringify(result, null, ' '));
  });

});
