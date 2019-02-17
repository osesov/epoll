const epoll = artifacts.require("epoll");

module.exports = function(deployer) {
  deployer.deploy(epoll);
};
