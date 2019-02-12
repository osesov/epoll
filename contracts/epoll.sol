pragma solidity >=0.4.21 <0.6.0;

contract epoll {
    address public owner;
    string public pollInfo;
    string public subject;
    string[] public choices;
    uint[] public results;
    uint256 public startTime;
    uint256 public endTime;

    mapping(address => bool) voted;

    event Vote(uint256 outcome);
    event PollStart(address pollId);
    event PollClose(address pollId);

    constructor(string memory pollInfo_) public {
        owner = msg.sender;
        pollInfo = pollInfo_;
        startTime = now;
        endTime = 0;

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

        emit PollStart(address(this));
    }

    modifier whenOwner() {
        if (msg.sender == owner)
            _;
    }

    modifier whenActive() {
        if (isActive())
            _;
    }

    function isActive() public view returns(bool) {
        return endTime == 0;
    }

    function isClosed() public view returns(bool) {
        return endTime != 0;
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

    function closePoll() public whenOwner whenActive {
        endTime = now;
        emit PollClose(address(this));
    }

    function vote(uint choice) public {
        uint status = 0;

        if (choice >= choices.length)
            status += 1;
        if (voted[msg.sender])
            status += 2;
        if (isClosed())
            status += 4;

        if (status == 0) {
            results[choice] += 1;
            voted[msg.sender] = true;
        }
        emit Vote(status);
    }
}
