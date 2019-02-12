pragma solidity >=0.4.21 <0.6.0;

contract epoll {
    address public owner;
    string public subject;
    string[] public choices;
    uint[] public results;

    uint256 public e; // RSA signing exponent
    uint256 public n; // RSA signing modulo
    mapping(address => bool) voted;

    constructor(string memory subject_,
                string memory choices_,
                uint256 e_,
                uint256 n_) public {
        owner = msg.sender;
        e = e_;
        n = n_;
        setChoices(subject_, choices_);
    }

    modifier restricted() {
        if (msg.sender == owner)
            _;
    }

    modifier isEmpty() {
        if (choices.length == 0)
            _;
    }

    modifier isNotEmpty() {
        if (choices.length > 0)
            _;
    }

    function setChoices(string memory subject_, string memory choices_) internal restricted isEmpty {
        subject = subject_;

        // split choices string
        bytes memory s = bytes(choices_);
        uint begin = 0;
        byte delim = byte(";");
        for (uint i = 0; i <= s.length; ++i) {
            if (i == s.length || s[i] == delim) {
                bytes memory r = new bytes(i - begin);
                for (uint j = begin; j < i; ++j)
                    r[j - begin] = s[j];

                choices.push(string(r));
                results.push(0);
                begin = i + 1;
            }
        }
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
        return uint256(voterAddress) == signature ** e % n;
    }

    function vote(uint256 signature, uint choice) public isNotEmpty {
        if (!checkSignature(msg.sender, signature))
            return;
        if (choice < choices.length)
            return;
        if (voted[msg.sender])
            return;
        
        results[choice] += 1;
    }

    ///
    function blind(address votingAddress, uint256 r) public view returns (uint256) {
        uint256 mul = r ** e % n;
        return uint256(votingAddress) * mul % n;
    }

    function sign(uint256 value, uint256 d) public view returns (uint256) {
        return (value ** d) % n;
    }

    function unblind(address signedValue, uint256 rInv) public view returns (uint256) {
        return (uint256(signedValue) * rInv) % n;
    }
}

contract epollFactory {
    address[] public polls;

    function newPoll(string memory subject, string memory choices, uint256 e, uint256 n) public returns (address) {
        epoll newContract = new epoll(subject, choices, e, n);
        address pa = address(newContract);
        polls.push(pa);
        return pa;
    }
}
