
var $ = require('jquery');
const BN = require('bn.js');
const POLL = require("../../lib/poll.js")
const Web3 = require("web3");
const common = require("../common.js")

function pollManager() {
}

async function onNewPoll(address) {
  console.log(address);
  this.pollAddress = address;
  const voter = await this.poll.VOTER(this.accounts[1], address);
  const pollInfo = await voter.getPollInfo();

  $('#poll-address').val(this.pollAddress);
  $('#subject').val(pollInfo.subject);
  $('#poll-results-pane').hide();

  const choices = common.removeChildren("choices");

  for (i = 0; i < pollInfo.choices.length; ++i) {
    var row = choices.insertRow(-1);
    var cell1 = row.insertCell(0);

    const e = pollInfo.choices[i];
    const input = document.createElement("input");
    const id = 'choice-' + i;

    input.setAttribute('type', 'radio');
    input.setAttribute('id', id);
    input.setAttribute('value', i);
    input.setAttribute('name', 'choice');
    cell1.appendChild(input);

    const label = document.createElement("label");
    label.setAttribute('for', id)
    label.innerText = e;
    cell1.appendChild(label);
  }
}

async function onEndPoll(address) {
  if (address !== this.pollAddress)
    return;

  $('#poll-address').val("");
  $('#subject').val("");
  const choices = common.removeChildren("choices");

  await common.showPollResults(this.poll, this.pollAddress);
  this.pollAddress = null;
}

pollManager.prototype.init = async function() {
  const url = $("meta[name='web3']").attr('content');

  if (!url)
    alert("Web3 URL is not set")

  this.web3 = new Web3( new Web3.providers.WebsocketProvider(url) );
  this.accounts = await this.web3.eth.getAccounts();
  this.poll = new POLL(this.web3);
  this.pollAddress = null

  this.accounts.shift();

  $('#poll-results-pane').hide();
  this.poll.onNewBlock(common.onNewBlock);
  this.poll.onNewPoll(onNewPoll.bind(this));
  this.poll.onEndPoll(onEndPoll.bind(this));

  var addrSelector = document.getElementById("voter-address");
  this.accounts.forEach( (e) => {
    var option = document.createElement("option");
    option.text = e;
    addrSelector.appendChild(option);
  })
}


pollManager.prototype.vote = async function() {

  const addrSelector = document.getElementById("voter-address");
  const voterAddress = addrSelector.options[addrSelector.selectedIndex].text;
  const choice = document.forms.vote.choice.value;

  if (choice === "") {
    alert("Ничего не выбрано!");
    return;
  }

  const voter = await this.poll.VOTER(voterAddress, this.pollAddress);
  const outcome = await voter.vote(choice);

  if (outcome != 0) {
    alert("Голос не принят: " + outcome);
  }
}

$(document).ready(async () => {
    console.log("ready!")

    p = new pollManager();
    await p.init()
    $('form#vote').on('submit', (e) => {
      p.vote();
      e.preventDefault();
      return false;
    });
})
