const Web3 = require('web3');
const fs = require('fs');
const solc = require('solc');
const proxycall_abi = require("./build/ERC721CreatorImplementation.json");
const {
    privateKey
} = require("./key")

const verify_plugin = require('solc-plugin-verify-proxy/verify')

const contractName = 'ERC721Creator';
const filePath = `contracts/${contractName}.sol`;

let config = {
    api_keys: {
        etherscan: 'AA3K43AEQ43AZ2RQXW59FNUG4KB1Q84FZ8'
    },
    networks: {
        development: {
            host: "127.0.0.1",     // Localhost (default: none)
            port: 8545,            // Standard Ethereum port (default: none)
            network_id: "*",       // Any network (default: none)
        },
        bsc_testnet: {
            provider: () => new Web3.providers.HttpProvider('https://data-seed-prebsc-1-s1.binance.org:8545'),
            network_id: 97,
            confirmations: 10,
            timeoutBlocks: 200,
            skipDryRun: true
        },
        bsc: {
            provider: () => new Web3.providers.HttpProvider('https://bsc-dataseed1.binance.org'),
            network_id: 56,
            confirmations: 10,
            timeoutBlocks: 200,
            skipDryRun: true
        },
        rinkeby: {
            provider: () => new Web3.providers.HttpProvider('https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'),
            network_id: 4,
            skipDryRun: true
        }
    },
    network: 'rinkeby',
    working_directory: '/Users/shuning/code/nft_creator_web',
    contracts_build_directory: '/Users/shuning/code/nft_creator_web/build',
    contract_name_address_pairs: [],
    debug: true
}

const token_uri = 'ipfs://QmdVXTnbXPLBk5JjiXcZCyS6z42ugEh8265apaa7LACW4F/2.json'
const web3 = new Web3(config.networks[config.network].provider());
web3.eth.accounts.wallet.add(privateKey);

async function deploy_contract() {
    // get deployer address
    let deployeAddr = web3.eth.accounts.wallet[0].address;
    console.log({ deployeAddr })

    // compile
    let source = fs.readFileSync(filePath, 'UTF-8');
    let input = {
        language: 'Solidity',
        sources: {},
        settings: {
            remappings: [ "@openzeppelin/=./node_modules/@openzeppelin/" ],
            outputSelection: {
                '*': {
                    '*': ['*']
                }
            }
        }
    };
    input.sources[filePath] = {
        content: source
    }

    // import external files
    function findImports(path) {
        return {
            contents: fs.readFileSync(path, 'UTF-8')
        }
    }

    // compile
    let calcCompiled = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
    let targetCompiled = calcCompiled['contracts'][filePath][contractName]

    // get abi
    let abi = targetCompiled['abi'];

    // get bytecode
    let bytecode = targetCompiled.evm.bytecode.object
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

    // calcCompiledCopy = JSON.parse(JSON.stringify(calcCompiled))
    
    try {
        // pretty-print JSON object to string
        const data = JSON.stringify(targetCompiled, null, 2);
        fs.writeFileSync(`./build/${contractName}.json`, data);
        console.log("JSON data is saved.");
    } catch (error) {
        console.error(error);
    }

    return proxy_address
}

async function verify() {
    console.log(config)
    let isSuccess = await verify_plugin(config)
    return isSuccess
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
    
    let proxy_address

    // // deploy
    // proxy_address = await deploy_contract()
    // console.log({ proxy_address })
    
    // verify
    // update config for subsequent verify
    proxy_address = '0xeCcD9c5ac191bc24F317F4977Dd085645CA202AA'
    config.contract_name_address_pairs.push(`${contractName}@${proxy_address}`)
    let isVerified = await verify()
    console.log(isVerified)

    
    // // airdrop or self-mint
    // proxy_address = '0xeCcD9c5ac191bc24F317F4977Dd085645CA202AA'
    // const mint_to = '0xb72B1dE0E431FA88bD24be4Ea0Eab3661abFBa35'
    // let mint_res = await mint(proxy_address, mint_to)
    // console.log({ mint_res })
}

main()