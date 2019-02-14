pragma solidity >=0.4.21 <0.6.0;

contract PollManager {

    event PollStatus(uint256 pollId, uint status);
    event Vote(uint256 pollId, uint256 status);

    enum PollState {
        NONE, ACTIVE, CLOSED
    }

    struct Poll {
        uint256 id;

        // poll data
        uint startTime;
        uint256 endTime;
        string  subject;
        string[] choices;
        uint[] results;

        uint256 e; // RSA signing exponent
        uint256 n; // RSA signing modulo
        mapping(address => bool) voted;
    }

    uint256[] activePollList; //
    uint256[] historicalPollList; //
    mapping (uint256 => Poll) private pollInfo; // id -> poll

    uint256 public nonce;
    address public owner;

    modifier restricted() {
        if (msg.sender == owner)
            _;
    }

    function newPoll(string memory subject, string memory choices, uint256 e, uint256 n) public restricted {
        uint256 id = nonce++;
        Poll storage poll = pollInfo[id];

        if (poll.id != 0)
            return;

        //
        poll.id = id;
        poll.subject = subject;
        poll.e = e;
        poll.n = n;
        poll.startTime = now;
        poll.endTime = 0;

        // split choices string
        bytes memory s = bytes(choices);
        uint begin = 0;
        byte delim = byte(";");
        for (uint i = 0; i <= s.length; ++i) {
            if (i == s.length || s[i] == delim) {
                bytes memory r = new bytes(i - begin);
                for (uint j = begin; j < i; ++j)
                    r[j - begin] = s[j];

                poll.choices.push(string(r));
                poll.results.push(0);
                begin = i + 1;
            }
        }

        // enlist the poll
        pollInfo[poll.id] = poll;
        activePollList.push(poll.id);
        emit PollStatus(poll.id, 0);
    }

    function closePoll(uint256 pollId) public {
        Poll storage p = pollInfo[pollId];
        if (p.startTime == 0)
            return;

        if (p.endTime != 0)
            return;

        for (uint256 j = 0; j < activePollList.length; ++j) {
            if (activePollList[j] == pollId) {
                delete activePollList[j];
                break;
            }
        }

        p.endTime = now;
        historicalPollList.push(pollId);
    }

    function getActivePollCount() public view returns(uint256) {
        return activePollList.length;
    }

    function getActivePollId(uint256 index) public view returns (uint256) {
        return activePollList[index];
    }

    function getHistoricalPollCount() public view returns(uint256) {
        return historicalPollList.length;
    }

    function getHistoricalPollId(uint256 index) public view returns(uint256) {
        return historicalPollList[index];
    }

    //
    function getStartTime(uint256 pollId) public view returns(uint) {
        Poll storage poll = pollInfo[pollId];
        return poll.startTime;
    }

    function getEndTime(uint256 pollId) public view returns(uint) {
        Poll storage poll = pollInfo[pollId];
        return poll.startTime;
    }

    function getNumberOfChoices(uint256 pollId) public view returns(uint) {
        Poll storage poll = pollInfo[pollId];
        return poll.choices.length;
    }

    function getChoice(uint256 pollId, uint index) public view returns(string memory) {
        Poll storage poll = pollInfo[pollId];
        return poll.choices[index];
    }

    function getResult(uint256 pollId, uint index) public view returns(uint) {
        Poll storage poll = pollInfo[pollId];
        return poll.results[index];
    }

    function getPollState(uint256 pollId) public view returns(PollState) {
        Poll storage poll = pollInfo[pollId];
        if (poll.startTime == 0)
            return PollState.NONE;
        else if (poll.endTime == 0)
            return PollState.CLOSED;
        else
            return PollState.ACTIVE;
    }

    function checkSignature(address voterAddress, uint256 signature, uint256 e, uint256 n) public pure returns (bool) {
        return uint256(voterAddress) == modpow(signature, e, n);
    }

    function vote(uint256 pollId, uint256 signature, uint choice) public {
        uint status = 0;

        Poll storage poll = pollInfo[pollId];
        if (!checkSignature(msg.sender, signature, poll.e, poll.n))
            status += 1;
        if (choice >= poll.choices.length)
            status += 2;
        if (poll.voted[msg.sender])
            status += 4;
        if (poll.startTime == 0)
            status += 8;
        if (poll.endTime != 0)
            status += 16;
            
        if (status == 0) {
            poll.results[choice] += 1;
            poll.voted[msg.sender] = true;
        }
        emit Vote(pollId, status);
    }

    ///
    // function modmul(uint256 a, uint256 b, uint256 modulo) public pure returns(uint256 x) {
    //     assembly { x := mulmod(a, b, modulo) }
    // }

    function modpow(uint256 a, uint256 b, uint256 modulo) public pure returns(uint256) {
        uint256 result = 1;
        uint256 base = a % modulo;
        uint256 runner = b % modulo;

        while (runner > 0) {
            if (runner & 1 != 0)
                result = mulmod(result, base, modulo);
            base = mulmod(base, base, modulo);
            runner = runner >> 1;
        }
        return result;
    }
}
