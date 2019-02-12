const epollFactory = artifacts.require("epollFactory");

module.exports = function(deployer) {
  deployer.deploy(epollFactory);
};
