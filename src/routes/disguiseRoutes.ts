import Router from 'koa-router';

import Attestation from '../models/attestation';
import Log from '../models/log';
import Disguise, { DisguiseOptions } from '../models/disguise';

import ZapperApi from '../lib/zapperfi';
import CoinGeckoApi from '../lib/coingecko';
import Web3Api from '../lib/web3';
import moment from 'moment';
import EtherscanAPI from '../lib/etherscan';
import BlockExplorersAPI from '../lib/blockExplorers';
import BinanceAPI from '../lib/binance';

const web3 = new Web3Api();
const cid = process.env.WEB3_CID;

const disguiseRoutes = new Router({
    prefix: '/disguises'
});

disguiseRoutes.get('/coins/list', async ctx=> {
    try {
        let coins = await CoinGeckoApi.getCoinsList();

        ctx.body = coins;
    } catch(e) {
        console.log(e);
        ctx.status = 500;
        ctx.body = e;
    }
});

disguiseRoutes.get('/coins/gas/prices', async ctx=> {
    try {
        let prices = await CoinGeckoApi.getGasCoinsPrices();

        ctx.body = prices;
    } catch(e) {
        console.log(e);
        ctx.status = 500;
        ctx.body = e;
    }
});

disguiseRoutes.get('/coins/gas/prices/update', async ctx=> {
    try {
        let prices = await CoinGeckoApi.updateGasCoinsPrices();

        ctx.body = prices;
    } catch(e) {
        console.log(e);
        ctx.status = 500;
        ctx.body = e;
    }
});

disguiseRoutes.get('/coins/gas/prices/init', async ctx=> {
    try {
        let status = await CoinGeckoApi.initGasCoinsPrices();

        ctx.body = status;
    } catch(e) {
        console.log(e);
        ctx.status = 500;
        ctx.body = e;
    }
});

disguiseRoutes.get('/transactions/gas', async ctx => {
    let { addresses, chains } = ctx.request.body;

    try {
        // @ts-ignore: Not my package
        let gasContrainer = await ZapperApi.getTransactionsGas(addresses, chains);

        ctx.body = gasContrainer;
    } catch(e) {
        console.log(e);
        ctx.status = 500;
        ctx.body = e;
    }
});

disguiseRoutes.get('/binance/balances', async ctx => {
    let { apiToken, secretApiKey } = ctx.request.body;

    try{
        // @ts-ignore: Not my package
        ctx.body = await BinanceAPI.getBalances(apiToken, secretApiKey)
    } catch(e){
        console.log(e);
        ctx.status = 500;
        ctx.body = e;
    }
});

disguiseRoutes.get('/transactions/stats', async ctx => {
    let { addresses, chains } = ctx.request.body;

    try {
        // @ts-ignore: Not my package
        let gasContrainer = await BlockExplorersAPI.getTxsStats(addresses, chains);

        ctx.body = gasContrainer;
    } catch(e) {
        console.log(e);
        ctx.status = 500;
        ctx.body = e;
    }
});

disguiseRoutes.get('/transactions', async ctx => {
    let { addresses, chains } = ctx.request.body;

    try {
        // @ts-ignore: Not my package
        let transactions = await ZapperApi.getTransactions(addresses, chains);

        ctx.body = transactions;
    } catch(e) {
        console.log(e);
        ctx.status = 500;
        ctx.body = e;
    }
});

disguiseRoutes.get('/transactions/erc-721', async ctx => {
    let { addresses, chains } = ctx.request.body;

    try {
        // @ts-ignore: Not my package
        let transactions = await EtherscanAPI.getTransactionsERC721(addresses, chains)

        ctx.body = transactions;
    } catch(e) {
        console.log(e);
        ctx.status = 500;
        ctx.body = e;
    }
});

disguiseRoutes.get('/transactions/erc-721/gas', async ctx => {
    let { addresses, chains } = ctx.request.body;

    try {
        // @ts-ignore: Not my package
        let gas = await EtherscanAPI.getTransactionsERC721Gas(addresses, chains)

        ctx.body = gas;
    } catch(e) {
        console.log(e);
        ctx.status = 500;
        ctx.body = e;
    }
});


disguiseRoutes.post('/attestations/:url/sign', async ctx => {
    try {
        let { address, hash } = ctx.request.body;
        let success = false;

        ctx.body = success;
    } catch(e) {
        console.log(e);
        ctx.status = 500;
        ctx.body = e;
    }
});

disguiseRoutes.get('attestations/:url', async ctx => {
    try {
        let { url } = ctx.request.body;

        let attesation = await Attestation.findOne({
            where: {
                url: url
            }
        });

        ctx.body = attesation;
    } catch(e) {
        console.log(e);
        ctx.status = 500;
        ctx.body = e;
    }
});

disguiseRoutes.post('/attestations/generate', async ctx => {
    try {
        let { name, amount } = ctx.request.body;

        let attesation = await Attestation.create({
            // @ts-ignore: Not my package
            name: name,
            type: 'uniswap-v3',
            url: Attestation.generateUrl(10),
            secret: Attestation.generateUrl(16),
            status: 0,
            // @ts-ignore: Not my package
            amount: amount,
            unit: 'eth',
            generation: Number(moment.utc().format('X')),
            confirmation: null,
            expiration: null
        });

        ctx.body = attesation;
    } catch(e) {
        console.log(e);
        ctx.status = 500;
        ctx.body = e;
    }
});

disguiseRoutes.post('/generate', async ctx => {
    try {
        let body = ctx.request.body;
        let addresses = body.address || body.addresses;
        let addressesArray = Array.isArray(addresses) ? addresses : [addresses];
        let lowerCaseAddresses = addressesArray.map((address: string) => address.toLowerCase());
        let password = body.password ? String(body.password) : null;

        let options: DisguiseOptions = {
            isGroupAssetsUnder: Boolean(body.isGroupAssetsUnder) || false,
            groupAssetsUnder: Number(body.groupAssetsUnder) || 0.1,
            ignoreNFTs: Boolean(body.ignoreNFTs) || false,
            isSnapshot: Boolean(body.isSnapshot) || false,
            showNFTCollections: Boolean(body.showNFTCollections) || false,
            // @ts-ignore: Not my package
            chains: body.chains || ['all'],
            // @ts-ignore: Not my package
            assetCategories: body.assetCategories || ['all']
        };

        // @ts-ignore: Not my package
        let disguise = await Disguise.generate(lowerCaseAddresses, body.name, body.duration, body.preset, password, options, true);

        ctx.body = disguise?.filter();
    } catch(e) {
        console.log(e);
        ctx.status = 500;
        ctx.body = e;
    }
});

disguiseRoutes.get('/url/:url/balances/:password?', async ctx => {
    try {
        let balances: any; // find more TS compliant solution
        let url = ctx.params.url;
        let password = ctx.params.password || null;

        let disguise: Disguise | null = await Disguise.findOne({
            where: {
                url: url
            }
        });

        if(disguise && disguise.isValid()) {
            if(disguise.password != null) {
                if(!password) ctx.throw(401, `Disguise is password protected, no password provided.`);
                if(!disguise.isValidPassword(password)) ctx.throw(401, `Incorrect password.`);

                if(disguise?.isCacheValid()) {
                    if(disguise.status == 1) {
                        balances = disguise.cache;
                    } else {
                        balances = await ZapperApi.getBalances(disguise, true);
                    }
                } else {
                    balances = await ZapperApi.getBalances(disguise, true);
                }
    
                balances.disguise = disguise.filter();
            } else {
                if(disguise?.isCacheValid()) {
                    if(disguise.status == 1) {
                        balances = disguise.cache;
                    } else {
                        balances = await ZapperApi.getBalances(disguise, true);
                    }
                } else {
                    balances = await ZapperApi.getBalances(disguise, true);
                }
    
                balances.disguise = disguise.filter();
            }
        } else {
            // check on IPFS
            let ipfsDisguise = await web3.findRecord(url);

            if(ipfsDisguise) {
                balances = ipfsDisguise.cache;
                balances.disguise = ipfsDisguise.filter();
            } else {
                console.log('error');
                ctx.throw(404, `No disguise found.`)
            }
        }

        ctx.body = balances;
    } catch(e: any) {
        console.log(e);
        ctx.status = e.status || e.response?.status || 500;
        ctx.body = e;
    } 
});

// disguiseRoutes.get('/:id/balances', async ctx => {
//     try {
//         let balances;
//         let disguise = await Disguise.findByPk(ctx.params.id);

//         if(disguise && disguise.isValid()) {
//             balances = await ZapperApi.getBalances(disguise, false);
//         } else {
//             ctx.throw(404, `No disguise found.`)
//         }

//         ctx.body = balances;
//     } catch(e) {
//         ctx.status = 404;
//         ctx.body = e;
//     } 
// });

// disguiseRoutes.get('/url/:url/balances/staking', async ctx => {
//     try {
//         let stakingBalance;
//         let disguise = await Disguise.findOne({
//             where: {
//                 url: ctx.params.url
//             }
//         });

//         if(disguise && disguise.isValid()) {
//             stakingBalance = await ZapperApi.getStakingBalances(disguise);
//         } else {
//             ctx.throw(404, `No disguise found.`)
//         }

//         ctx.body = stakingBalance;
//     } catch(e) {
//         ctx.status = 404;
//         ctx.body = e;
//     } 
// });

// disguiseRoutes.get('/:id/supportedProtocols', async ctx => {
//     try {
//         let supportedProtocols;
//         let disguise = await Disguise.findByPk(ctx.params.id);

//         if(disguise && disguise.isValid()) {
//             supportedProtocols = await ZapperApi.getSupportedProtocols(disguise);
//         } else {
//             ctx.throw(404, `No disguise found.`)
//         }

//         ctx.body = supportedProtocols;
//     } catch(e) {
//         ctx.status = 404;
//         ctx.body = e;
//     } 
// });

// disguiseRoutes.get('/url/:url/supportedProtocols', async ctx => {
//     try {
//         let supportedProtocols;
//         let disguise = await Disguise.findOne({
//             where: {
//                 url: ctx.params.url
//             }
//         });

//         if(disguise && disguise.isValid()) {
//             supportedProtocols = await ZapperApi.getSupportedProtocols(disguise);
//         } else {
//             ctx.throw(404, `No disguise found.`)
//         }

//         ctx.body = supportedProtocols;
//     } catch(e) {
//         ctx.status = 404;
//         ctx.body = e;
//     } 
// });

// disguiseRoutes.get('/:id', async ctx => {
//     try {
//         let disguise: Disguise | null = await Disguise.findByPk(ctx.params.id);

//         if(!disguise || !disguise.isValid()) {
//             ctx.throw(404, `No disguise found for ${ctx.params.id}`);
//         }

//         ctx.body = disguise;
//     } catch(e) {
//         ctx.status = 404;
//         ctx.body = e;
//     }
// });

// // working on sequelize association: SequelizeEagerLoadingError
// disguiseRoutes.get('/:id/cache', async ctx => {
//     try {
//         let disguise = await Disguise.findByPk(ctx.params.id, {
//             include: [{
//                 model: DisguiseCache, required: false
//             }]
//         });
//         if(!disguise || !disguise.isValid()) {
//             ctx.throw(404, `No disguise found for ${ctx.params.id}`);
//         }

//         ctx.body = disguise;
//     } catch(e) {
//         ctx.status = 404;
//         ctx.body = e;
//     }
// });

export default disguiseRoutes;