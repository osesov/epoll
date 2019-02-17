pragma solidity >=0.4.21 <0.6.0;

contract epoll {
    address public owner;
    uint256 public pollId;
    string public pollInfo;
    string public subject;
    string[] public choices;
    uint[] public results;
    uint256 public startTime;
    uint256 public endTime;

    uint256 public e; // RSA signing exponent
    uint256 public n; // RSA signing modulo
    mapping(address => bool) voted;
    address[] private voters;

    event Vote(uint256 outcome);
    event PollStart(uint256 pollId, string pollInfo);
    event PollClose(uint256 pollId, string pollInfo, uint result);

    constructor() public {
        owner = msg.sender;
        startTime = endTime = 1;
    }

    // constructor(string memory subject_,
    //             string memory choices_,
    //             uint256 e_,
    //             uint256 n_) public {
    //     owner = msg.sender;
    //     initPoll(subject_, choices_, e_, n_);
    // }

    modifier whenOwner() {
        if (msg.sender == owner)
            _;
    }

    modifier whenActive() {
        if (isActive())
            _;
    }

    modifier whenClosed() {
        if (isClosed())
            _;
    }

    function isActive() public view returns(bool) {
        return endTime == 0;
    }

    function isClosed() public view returns(bool) {
        return endTime != 0;
    }

    function initPoll(string memory pollInfo_, uint256 e_, uint256 n_) private {
        pollInfo = pollInfo_;
        n = n_;
        e = e_;
        startTime = now;
        endTime = 0;
        pollId++;

        // clean up previous poll
        for (uint j = 0; j < voters.length; ++j)
            delete voted[voters[j]];

        delete choices;
        delete results;
        delete voters;

        // split choices string
        bytes memory s = bytes(pollInfo_);
        uint begin = 0;
        byte delim = byte(";");
        for (uint i = 0; i <= s.length; ++i) {
            if (i == s.length || s[i] == delim) {
                bytes memory r = new bytes(i - begin);
                for (uint j = begin; j < i; ++j)
                    r[j - begin] = s[j];

                if (begin == 0)
                    subject = string(r);
                else { 
                    choices.push(string(r));
                    results.push(0);
                }
                begin = i + 1;
            }
        }

        emit PollStart(pollId, pollInfo);
    }

    function startPoll(string memory pollInfo_, uint256 e_, uint256 n_) public whenOwner whenClosed
    {
        initPoll(pollInfo_, e_, n_);
    }

    function getNumberOfChoices() public view returns(uint) {
        return choices.length;
    }

    function getChoice(uint index) public view returns(string memory) {
        return choices[index];
    }

    function getResult(uint index) public view returns(uint) {
        return results[index];
    }

    function checkSignature(address voterAddress, uint256 signature) public view returns (bool) {
        return uint256(voterAddress) == modpow(signature, e, n);
    }

    function closePoll() public whenOwner whenActive {
        endTime = now;
        uint maxValue = results[0];
        uint maxIndex = 0;

        for (uint j = 1; j < results.length; ++j) {
            if (results[j] > maxValue) {
                maxValue = results[j];
                maxIndex = j; 
            }
        }

        emit PollClose(pollId, pollInfo, maxIndex);
    }

    function vote(uint256 signature, uint choice, uint pollId_) public whenActive {
        uint status = 0;

        if (!checkSignature(msg.sender, signature))
            status += 1;
        if (choice >= choices.length)
            status += 2;
        if (voted[msg.sender])
            status += 4;
        if (pollId != pollId_)
            status += 8;

        if (status == 0) {
            results[choice] += 1;
            voted[msg.sender] = true;
            voters.push(msg.sender);
        }
        emit Vote(status);
    }

    ///
    function modmul(uint256 a, uint256 b, uint256 modulo) public pure returns(uint256 x) {
        assembly { x := mulmod(a, b, modulo) }
    }

    function modpow(uint256 a, uint256 b, uint256 modulo) public pure returns(uint256) {
        uint256 result = 1;
        uint256 base = a % modulo;
        uint256 runner = b % modulo;

        while (runner > 0) {
            if (runner & 1 != 0)
                result = modmul(result, base, modulo);
            base = modmul(base, base, modulo);
            runner = runner >> 1;
        }
        return result;
    }
}
