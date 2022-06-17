const Web3 = require('web3');
const fs = require('fs');
const solc = require('solc');
const proxycall_abi = require("./abi/ERC721CreatorImplementation.json");
const {
    privateKey
} = require("./key")

const rpc = "https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"
const web3 = new Web3(new Web3.providers.HttpProvider(rpc));
const token_uri = 'ipfs://QmdVXTnbXPLBk5JjiXcZCyS6z42ugEh8265apaa7LACW4F/2.json'

web3.eth.accounts.wallet.add(privateKey);

async function deploy_contract() {
    // get deployer address
    let deployeAddr = web3.eth.accounts.wallet[0].address;
    console.log({ deployeAddr })

    // compile
    let fileName = 'ERC721Creator';
    let source = fs.readFileSync(fileName+'.sol', 'UTF-8');
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
    let abi = calcCompiled['contracts']['hello.sol'][fileName]['abi'];

    // get bytecode
    let bytecode = calcCompiled['contracts']['hello.sol'][fileName].evm.bytecode.object
    console.log(abi, bytecode)

    // new Contract
    const calcContract = new web3.eth.Contract(abi);

    // deploy
    let proxy_address = await calcContract.deploy({
        data: '0x' + bytecode,
        arguments: ['contract_name', 'contract_symbol']
    }).send({
        from: deployeAddr,
        gas: 1500000
    }).on('error', (error) => { 
        console.error(error)
    }).on('transactionHash', (transaction_hash) => {
        console.log({ transaction_hash })
    }).then((instance) => {
        // instance with new contract address          
        return instance.options.address
    });

    return proxy_address
}

async function mint(proxy_address, mint_to) {
    // get signer address
    let signer = web3.eth.accounts.wallet[0].address;
    console.log({ signer })
    
    // call data
    const proxy_call = new web3.eth.Contract(proxycall_abi.abi, proxy_address)
    const estimateData = proxy_call.methods.mintBase(mint_to, token_uri).encodeABI()

    // estimate gas unit
    const estimateGas = await web3.eth.estimateGas({
        from: signer,
        to: proxy_address,
        data: estimateData
    })
    console.log({ estimateGas })
    
    // sign the transaction
    let signedTransactionObject = await web3.eth.accounts.signTransaction(
        {
            from: signer,
            to: proxy_address,
            data: estimateData,
            gas: estimateGas
        },
        privateKey
    )
    
    // send the signed transaction
    let result = await web3.eth.sendSignedTransaction(
        signedTransactionObject.rawTransaction
    ).on('error', (error) => { 
        console.error(error)
    }).on('transactionHash', (transactionHash) => {
        console.log({ transactionHash })
    })
    
    return result.status
}

async function main() {
    // deploy
    let proxy_address = await deploy_contract()
    // proxy_address = '0x0c52e85A0fc951482c890e0d2B320DC4e7332eB9'
    console.log({ proxy_address })

    // airdrop or self-mint
    const mint_to = '0xb72B1dE0E431FA88bD24be4Ea0Eab3661abFBa35'
    let mint_res = await mint(proxy_address, mint_to)
    console.log({ mint_res })
}

main()