import axios from 'axios';
import { URLSearchParams } from 'url';
import Disguise from '../models/disguise';
import Preset from '../models/preset';
import IAddressProtocol from './interfaces/addressProtocol';
import IStakingAsset from './interfaces/stakingAsset';
import IAsset from './interfaces/asset';
import AddressBalances from '../models/addressBalances';
import {
    AssetCategories,
    getEmptyBalances,
    getEmptyAssets,
    getAssetCategories,
    addAsset,
    extractTokens,
    extractAssetImg
} from './helpers';

// gauge & single-staking return assets classified as non staking (pool, base, deposit, etc...)
// they are still accounted for in staking since most of them are not listed in general balance route
const SUPPORTED_STAKING_PROTOCOLS = ['masterchef', 'gauge', 'single-staking'];

class ZapperApi {
    private static apiKey?: string = process.env.ZAPPERFI_API_KEY;
    private static apiUrl: string = `https://api.zapper.fi/v1`;

    constructor() {

    }

    static async getSupportedProtocols(disguise: Disguise) {
        let params = new URLSearchParams();
        params.append('addresses[]', disguise.address);
        params.append('api_key', ZapperApi.apiKey || '');
        const url = `${ZapperApi.apiUrl}/protocols/balances/supported?` + params.toString(); 

        try {
            let response = await axios.get(url);
            let networks = response.data;
            let uniqueProtocols = new Set();

            for(let network of networks) {
                for(let protocol of network.protocols) {
                    uniqueProtocols.add(protocol.protocol);
                }
            }

            return Array.from(uniqueProtocols);
        } catch(e) {
            console.log(`[zapperFi.getSupportedProtocoals]: ${e}`);
            return e;
        }
    }

    static async getBalances(disguise: Disguise, saveCache: boolean = false) {
        let balances = getEmptyBalances();
        let assets = getEmptyAssets();

        try {
            let stakingBalance: number;
            let stakingTokens: IAsset[];
            let claimableTokens: IAsset[];

            let uniqueProtocols: any = await ZapperApi.getSupportedProtocols(disguise); // TODO: how to handle returned type Promise<string[]> doesn't work
            let promises = ZapperApi.balancePromiseGenerator(disguise, uniqueProtocols);
            let responses = await Promise.all(promises);

            for(let response of responses) {
                let protocolBalances = response.data;
                let addressesProtocol: IAddressProtocol[] = Object.values(protocolBalances);

                for(let addressProtocol of addressesProtocol) {
                    for(let product of addressProtocol.products) {
                        for(let asset of product.assets) {
                            if(!asset.category) {
                                if(asset.location && asset.location.type) {
                                    asset.category = asset.location.type; // put the location type in category (some edge cases)
                                }
                            }
                            
                            if(asset.category == 'staked') { 
                                // https://github.com/disguisefy/disguisefy-api/projects/1#card-68794734
                                asset.category = 'staking';  
                            }

                            let assetCategory: AssetCategories = getAssetCategories(asset.category);
                            balances[assetCategory] += asset.balanceUSD;
                            addAsset(assets, assetCategory, asset);
                        }
                    }
                }
            }

            // special attention kid and needs its own dedicated route
            // [stakingBalance, stakingTokens, claimableTokens] = await ZapperApi.getStakingBalances(disguise);
            // balances[AssetCategories.staking] = stakingBalance;

            // for(let stakingToken of stakingTokens) {
            //     addAsset(assets, AssetCategories.staking, stakingToken);
            // }

            // for(let claimableToken of claimableTokens) {
            //     addAsset(assets, AssetCategories.claimable, claimableToken);
            // }

            let addressBalances = new AddressBalances(balances, assets);
            let preset = new Preset(disguise.preset);
            preset.filter(addressBalances);

            // do not wait for cache creation when regenerating while viewing
            if(saveCache) {
                Disguise.saveCache(disguise, addressBalances);
            }

            return addressBalances;
        } catch(e) {
            console.log(`[zapperFi.getBalances]: ${e}`);
            return e;
        }
    }

    // masterchef, gauge, single-staking
    static async getStakingBalances(disguise: Disguise): Promise<[number, IAsset[], IAsset[]]> {
        let stakingBalance: number = 0;
        let stakingTokens: IAsset[] = [];
        let claimableTokens: IAsset[] = [];

        try {
            let promises = ZapperApi.stakingBalancePromiseGenerator(disguise);
            let responses = await Promise.all(promises);

            for(let response of responses) {
                let stakingList = response.data[disguise.address];

                if(stakingList && stakingList.length > 0) {
                    for(let staking of stakingList) {
                        stakingBalance += parseFloat(staking.balanceUSD);

                        // add claimable tokens
                        if(staking.rewardTokens) {
                            claimableTokens = claimableTokens.concat(extractTokens(staking.rewardTokens));
                        }

                        // add stacking tokens
                        if(staking.tokens) {
                            stakingTokens = stakingTokens.concat(extractTokens(staking.tokens));
                        }
                    }
                }
            }

            return [stakingBalance, stakingTokens, claimableTokens];
        } catch(e) {
            console.log(`[zapperFi.getStakingBalances]: ${e}`);
            return [0, [], []];
        }
    }

    private static stakingBalancePromiseGenerator(disguise: Disguise) {
        let promises = [];
        let params = new URLSearchParams();
        params.append('addresses[]', disguise.address);
        params.append('api_key', ZapperApi.apiKey || '');

        for(let stakingProtocol of SUPPORTED_STAKING_PROTOCOLS) {
            let url = `${ZapperApi.apiUrl}/staked-balance/${stakingProtocol}?` + params.toString();
            promises.push(axios.get(url));
        }

        return promises;
    }

    private static balancePromiseGenerator(disguise: Disguise, protocols: any) { // find TS compliant solutions to interface protocols
        let promises = [];
        let params = new URLSearchParams();
        params.append('addresses[]', disguise.address);
        params.append('api_key', ZapperApi.apiKey || '');

        for(let protocol of protocols) {
            // Zapper allows to be network agnostic: maybe false and defaults to Ethereum?
            let url = `${ZapperApi.apiUrl}/protocols/${protocol}/balances?` + params.toString();
            promises.push(axios.get(url));
        }

        return promises;
    }
}

export default ZapperApi;