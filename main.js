const Web3 = require('web3');
const fs = require('fs');
const solc = require('solc');
const proxycall_abi = require("./abi/ERC721CreatorImplementation.json")

const rpc = "https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"
const web3 = new Web3(new Web3.providers.HttpProvider(rpc));
const {
    privateKey
} = require("./key")


async function main() {
    try {
        // signer
        web3.eth.accounts.wallet.add(privateKey);

        // compile
        let file_name = 'ERC721Creator';
        let source = fs.readFileSync(file_name+'.sol', 'UTF-8');
        var input = {
            language: 'Solidity',
            sources: {
                'hello.sol': {
                    content: source
                }
            },
            settings: {
                remappings: [ "@openzeppelin/=./node_modules/@openzeppelin/" ],
                outputSelection: {
                    '*': {
                        '*': ['*']
                    }
                }
            }
        };

        // import external files
        function findImports(path) {
            return {
                contents: fs.readFileSync(path, 'UTF-8')
            }
        }

        // compile
        let calcCompiled = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

        // get abi
        let abi = calcCompiled['contracts']['hello.sol'][file_name]['abi'];

        // get bytecode
        let bytecode = calcCompiled['contracts']['hello.sol'][file_name].evm.bytecode.object
        console.log(abi, bytecode)

        // new Contract
        // const calcContract = new web3.eth.Contract(abi, null, {
        //     data: '0x' + bytecode
        // });
        const calcContract = new web3.eth.Contract(abi);

        // get deployer address
        let deployeAddr = web3.eth.accounts.wallet[0].address;
        console.log(deployeAddr)

        // deploy
        calcContract.deploy({
            data: '0x' + bytecode,
            arguments: ['contract_name', 'contract_symbol']
        }).send({
            from: deployeAddr,
            gas: 1500000
        })
        .on('error', (error) => { 
            console.error(error)
        })
        .on('transactionHash', (transactionHash) => {
            console.log("transactionHash:" + transactionHash)
        })
        .on('receipt', (receipt) => {
            console.log("get receipt")
        }).then((newContractInstance) => {
            let proxy_address = newContractInstance.options.address
            console.log(proxy_address) // instance with the new contract address

            const proxycall = new web3.eth.Contract(proxycall_abi.abi, proxy_address)

            proxycall.methods.owner().call({from: '0x03cf9d0dcCe443490a855734dE039F411250e176'}, function(error, result){
                console.log(error, result)
            });

            proxycall.methods.symbol().call({from: '0x03cf9d0dcCe443490a855734dE039F411250e176'}, function(error, result){
                console.log(error, result)
            });
        });

    } catch (e) {
        console.error(e)
    }
}

main()