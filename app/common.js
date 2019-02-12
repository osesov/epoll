var $ = require('jquery');

function removeChildren(name) {
  var choices = document.getElementById(name);
  if (choices == null)
    return choices;
  while (choices.firstChild) {
    choices.removeChild(choices.firstChild);
  }
  return choices;
}

function chunkString(str, size, maxChunks) {
  const numChunks = Math.ceil(str.length / size)
  const chunks = new Array(numChunks < maxChunks ? numChunks : maxChunks)

  for (let i = 0, o = 0; i < chunks.length; ++i, o += size) {
    chunks[i] = str.substr(o, size)
  }

  if (numChunks >= maxChunks)
    chunks.push("...");

  return chunks
}

function onNewBlock(block) {
  const table = $('#log')[0];
  if (table == null)
    return;

  let pos = 0;

  const info = [
    {title: "№", value: block.number, class: "logHeaderClass" },
    {title: "хеш", value:  block.hash},
    {title: "предыдущий блок", value: block.parentHash},
    {title: "сложность", value:  block.difficulty},
    {title: "nonce", value:  block.nonce},
    {title: "time:", value:  new Date(1000*block.timestamp)},
    {title: `Транзакции (Всего ${block.transactions.length})`, value: null,
      class: block.transactions.length  == 0 ? "logTransactionHeaderEmpty" : "logTransactionHeader"}
  ]
  .concat( block.transactions.map( function(e,i) {
    const from = e.from == null ? "" : e.from;
    const to = e.to == null ? "" : e.to;

    let data = e.input;

    if (data == null)
      data = ""
    else {
      const manLen = 64 + 8;
      data = data.replace(/^(0x)/,"");
      if (data.length > manLen)
        data = "<div style=\"font-family: monospace\">&nbsp;&nbsp;&nbsp;&nbsp;" + chunkString(data, manLen, 8).join("<br>&nbsp;&nbsp;&nbsp;&nbsp;") + "<br><br></div>";
    }
    return {
      title : "Транзакция&nbsp;" + (1 + i),
      value : "От&nbsp;Кого: " + from + "<br>"
           + "Кому: " + to + "<br>"
           + "Данные: " + data,
      class: "logTransaction" };
  }))
  .forEach(e => {
    var row = table.insertRow(pos++);
    var cell1 = row.insertCell(0);
    var cell2 = row.insertCell(1);
    cell1.innerHTML = e.title;
    if (e.value == null)
      cell1.setAttribute("colspan", 2)
    else
      cell2.innerHTML = e.value;

    cell1.setAttribute("style", "vertical-align: top")
    
    const className = e["class"];
    if (className != null) {
      row.className = className;
      cell1.className = className;
      cell2.className = className;
    }

    
  });
}

async function showPollResults(poll, address) {
  const result = await poll.getResults(address);

  const table = removeChildren('poll-results')
  const best = result.results[0].count ? result.results[0].count : -1;
  const n = result.results.length;

  for (i = 0; i < n && result.results[i].count == best; ++i) {
    var row = table.insertRow(-1);
    var cell1 = row.insertCell(0);
    var cell2 = row.insertCell(1);

    cell1.innerHTML = result.results[i].count;
    cell2.innerHTML = result.results[i].text;

    [row, cell1, cell2].forEach( (e) => e.className = "winner-choice");
  }

  for (; i < n; ++i) {
    var row = table.insertRow(-1);
    var cell1 = row.insertCell(0);
    var cell2 = row.insertCell(1);

    cell1.innerHTML = result.results[i].count;
    cell2.innerHTML = result.results[i].text;

    [row, cell1, cell2].forEach( (e) => e.className = "looser-choice");
  }
  $('#poll-results-pane').show();
}

module.exports = {
  removeChildren: removeChildren,
  onNewBlock: onNewBlock,
  showPollResults: showPollResults
};

