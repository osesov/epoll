
var $ = require('jquery');
const BN = require('bn.js');
const POLL = require("../../lib/poll.js")
const Web3 = require("web3");
const common = require("../common.js")

function pollManager() {
}


pollManager.prototype.init = async function() {
  const url = $("meta[name='web3']").attr('content');

  if (!url)
    alert("Web3 URL is not set")

  this.web3 = new Web3( new Web3.providers.WebsocketProvider(url) );
  this.accounts = await this.web3.eth.getAccounts();
  this.poll = new POLL(this.web3);
  this.ca = await this.poll.CA(this.accounts[0]);
  this.pollAddress = null

  $('#poll-results-pane').hide();
  this.poll.onNewBlock(common.onNewBlock);
}

pollManager.prototype.newPoll = async function () {
  const subject = $('#subject').val();
  const choices = $('#choices').val()
    .split("\n")
    .map( (s) => s.trim() )
    .filter( (s) => s != null && s !== "" );

  console.info("CA: Create poll on '%s'. Choices:", subject);
  choices.forEach( (e, i)=>{ console.info("CA:\t%s) '%s'", i, e); });

  this.pollAddress = await this.ca.startPoll(subject, choices);
  console.info("CA: Poll address: %s", this.pollAddress);

  $('#poll-address').val(this.pollAddress);
  $('#poll-results-pane').hide();
  common.removeChildren('ca-poll-results')
}

pollManager.prototype.endPoll = async function () {

  const closed = await this.ca.endPoll(this.pollAddress)
  await common.showPollResults(this.poll, this.pollAddress)
}

$(document).ready(async () => {
    console.log("ready!")

    p = new pollManager();
    await p.init()
    $('form#ca-new-poll').on('submit', (e) => {
      p.newPoll();
      e.preventDefault();
      return false;
    });

    $('#ca-close-poll').on('click', (e) => {
      p.endPoll();
      e.preventDefault();
      return false;
    });

})
