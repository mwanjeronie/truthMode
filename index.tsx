/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

import { createConfig, http, WagmiProvider } from 'wagmi';
import { base, polygon } from 'wagmi/chains';
import { walletConnect } from '@wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAccount, useConnect, useDisconnect, useSwitchChain, useEnsName } from 'wagmi';

// --- WalletConnect Configuration ---
// IMPORTANT: Replace with your actual WalletConnect Cloud project ID
// Get one from https://cloud.walletconnect.com
const WALLETCONNECT_PROJECT_ID = '5edb882da82d1087da993ff03fd623ab';

const IS_PLACEHOLDER_ID = WALLETCONNECT_PROJECT_ID === 'YOUR_WALLETCONNECT_PROJECT_ID';
const IS_EXAMPLE_ID = WALLETCONNECT_PROJECT_ID === '5edb882da82d1087da993ff03fd623ab';

if (IS_PLACEHOLDER_ID) {
  console.error(
    'FATAL ERROR: WalletConnect Project ID is not configured. Please replace "YOUR_WALLETCONNECT_PROJECT_ID" with your actual WalletConnect Cloud project ID in index.tsx for the dApp to function.'
  );
} else if (IS_EXAMPLE_ID) {
  console.warn(
    'Reminder: WalletConnect Project ID is currently set to the example ID. For a production environment or your own testing, please replace it with your actual WalletConnect Cloud project ID in index.tsx.'
  );
}


const wagmiMetadata = {
  name: 'kaETH true mode',
  description: 'P2P Cross-Chain Escrow & Staking dApp by kaETH true mode',
  url: window.location.host, // Using current host as a placeholder
  icons: ['https://avatars.githubusercontent.com/u/37784886'] // Placeholder icon
};

const queryClient = new QueryClient();

const wagmiConfig = createConfig({
  chains: [base, polygon],
  connectors: [
    walletConnect({
      projectId: WALLETCONNECT_PROJECT_ID,
      metadata: wagmiMetadata,
      showQrModal: true,
    }),
  ],
  transports: {
    [base.id]: http(),
    [polygon.id]: http(),
  },
});

const CHAIN_BASE_ID = base.id;
const CHAIN_POLYGON_ID = polygon.id;

const CHAIN_ID_TO_NAME_MAP = {
  [CHAIN_BASE_ID]: 'Base',
  [CHAIN_POLYGON_ID]: 'Polygon',
};

const CHAIN_NAME_TO_ID_MAP = {
  'Base': CHAIN_BASE_ID,
  'Polygon': CHAIN_POLYGON_ID,
};


const MOCK_TOKENS = [
  { symbol: 'ETH', name: 'Ether' },
  { symbol: 'USDC', name: 'USD Coin' },
  { symbol: 'DAI', name: 'Dai Stablecoin' },
  { symbol: 'kaETH', name: 'kaETH Token' },
];

const MIN_STAKE_DURATION_DAYS = 7;
const MOCK_APY_RANGE = "5-10%"; 

interface StakedAsset {
  id: string;
  tokenSymbol: string;
  tokenName: string;
  amount: number;
  stakeTime: Date;
  unlockTime: Date;
  rewards: number;
}


const StakeView = () => {
  const [selectedTokenToStake, setSelectedTokenToStake] = useState(MOCK_TOKENS[0].symbol);
  const [stakeAmountInput, setStakeAmountInput] = useState('');
  const [stakedAssets, setStakedAssets] = useState<StakedAsset[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const rewardInterval = setInterval(() => {
      setStakedAssets(prevAssets =>
        prevAssets.map(asset => {
          if (currentTime < asset.unlockTime) { 
            return { ...asset, rewards: asset.rewards + asset.amount * 0.000001 }; 
          }
          return asset;
        })
      );
    }, 5000); 
    return () => clearInterval(rewardInterval);
  }, [currentTime]); 

  const handleStakeTokens = () => {
    const amount = parseFloat(stakeAmountInput);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount to stake.');
      return;
    }
    const tokenInfo = MOCK_TOKENS.find(t => t.symbol === selectedTokenToStake);
    if (!tokenInfo) {
      alert('Invalid token selected.');
      return;
    }

    const now = new Date();
    const unlockTime = new Date(now.getTime() + MIN_STAKE_DURATION_DAYS * 24 * 60 * 60 * 1000);

    const newStake: StakedAsset = {
      id: `stake-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      tokenSymbol: tokenInfo.symbol,
      tokenName: tokenInfo.name,
      amount,
      stakeTime: now,
      unlockTime,
      rewards: 0,
    };
    setStakedAssets(prev => [...prev, newStake]);
    setStakeAmountInput('');
    alert(`${amount} ${tokenInfo.symbol} staked successfully! It will unlock in ${MIN_STAKE_DURATION_DAYS} days.`);
  };

  const handleUnstake = (assetId: string) => {
    const asset = stakedAssets.find(a => a.id === assetId);
    if (asset && currentTime >= asset.unlockTime) {
      setStakedAssets(prev => prev.filter(a => a.id !== assetId));
      alert(`${asset.amount} ${asset.tokenSymbol} unstaked successfully.`);
    } else {
      alert('This asset is not yet eligible for unstaking or cannot be found.');
    }
  };

  const handleWithdrawRewards = (assetId: string) => {
    setStakedAssets(prev =>
      prev.map(asset => {
        if (asset.id === assetId && asset.rewards > 0) {
          alert(`Withdrew ${asset.rewards.toFixed(6)} ${asset.tokenSymbol} rewards.`);
          return { ...asset, rewards: 0 };
        }
        return asset;
      })
    );
  };

  const formatTimeRemaining = (unlockTime: Date) => {
    const totalSeconds = Math.max(0, Math.floor((unlockTime.getTime() - currentTime.getTime()) / 1000));
    if (totalSeconds === 0) return "Ready to Unstake";

    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  return (
    <div className="view-container staking-view-container">
      <h2>Staking Module</h2>
      <p>Stake your tokens to earn rewards from protocol fees. Estimated APY: <strong>{MOCK_APY_RANGE}</strong>. Minimum stake duration: <strong>{MIN_STAKE_DURATION_DAYS} days</strong>.</p>
      
      <section className="staking-form-section">
        <h3>Stake Your Tokens</h3>
        <div className="form-group">
          <label htmlFor="stakeTokenSelect">Token:</label>
          <select id="stakeTokenSelect" value={selectedTokenToStake} onChange={e => setSelectedTokenToStake(e.target.value)}>
            {MOCK_TOKENS.map(token => (
              <option key={token.symbol} value={token.symbol}>{token.name} ({token.symbol})</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="stakeAmountInput">Amount:</label>
          <input
            type="number"
            id="stakeAmountInput"
            value={stakeAmountInput}
            onChange={e => setStakeAmountInput(e.target.value)}
            placeholder="e.g., 100"
            min="0.000001"
            step="any"
          />
        </div>
        <button onClick={handleStakeTokens} className="button button-primary" disabled={!stakeAmountInput || parseFloat(stakeAmountInput) <= 0}>Stake Tokens</button>
      </section>

      <section className="staked-assets-section">
        <h3>Your Staked Assets</h3>
        {stakedAssets.length === 0 ? (
          <p>You have no tokens staked.</p>
        ) : (
          <div className="staked-assets-list">
            {stakedAssets.map(asset => (
              <div key={asset.id} className="staked-asset-item">
                <div className="asset-details">
                  <h4>{asset.amount} {asset.tokenName} ({asset.tokenSymbol})</h4>
                  <p>Staked On: {asset.stakeTime.toLocaleString()}</p>
                  <p>Unlocks In: {formatTimeRemaining(asset.unlockTime)}</p>
                  <p>Claimable Rewards: {asset.rewards.toFixed(6)} {asset.tokenSymbol}</p>
                </div>
                <div className="asset-actions">
                  <button
                    onClick={() => handleUnstake(asset.id)}
                    disabled={currentTime < asset.unlockTime}
                    className="button button-outline"
                  >
                    Unstake
                  </button>
                  <button
                    onClick={() => handleWithdrawRewards(asset.id)}
                    disabled={asset.rewards <= 0}
                    className="button"
                  >
                    Withdraw Rewards
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
       <div className="protocol-fee-benefit">
        <h4>Staking Benefits</h4>
        <p>By staking your tokens, you earn a share of the <strong>1.5% protocol fee</strong> collected from all cross-chain swaps. Rewards are distributed proportionally to your stake.</p>
      </div>
    </div>
  );
};


const SwapView = ({ currentChainName }) => {
  const [yourToken, setYourToken] = useState(MOCK_TOKENS[0].symbol);
  const [yourAmount, setYourAmount] = useState('');
  const [counterpartyAddress, setCounterpartyAddress] = useState('');
  const [counterpartyToken, setCounterpartyToken] = useState(MOCK_TOKENS[0].symbol);
  const [counterpartyAmount, setCounterpartyAmount] = useState('');

  const otherChainName = currentChainName === 'Base' ? 'Polygon' : 'Base';

  const handleSubmitSwap = (e) => {
    e.preventDefault();
    if (!yourAmount || !counterpartyAddress || !counterpartyAmount || parseFloat(yourAmount) <= 0 || parseFloat(counterpartyAmount) <= 0) {
      alert('Please fill in all fields with valid amounts and ensure amounts are greater than zero.');
      return;
    }
    const addressPattern = /^0x[a-fA-F0-9]{40}$/;
    if (!addressPattern.test(counterpartyAddress)) {
        alert('Please enter a valid Ethereum wallet address for the counterparty (e.g., 0x...).');
        return;
    }

    console.log('New Swap Initiated:', {
      userChain: currentChainName,
      yourToken,
      yourAmount: parseFloat(yourAmount),
      counterpartyAddress,
      counterpartyChain: otherChainName,
      counterpartyToken,
      counterpartyAmount: parseFloat(counterpartyAmount),
      platformFeePercent: 1.5,
    });
    alert('Swap initiated! (Check console for details). Form will be reset.');
    setYourToken(MOCK_TOKENS[0].symbol);
    setYourAmount('');
    setCounterpartyAddress('');
    setCounterpartyToken(MOCK_TOKENS[0].symbol);
    setCounterpartyAmount('');
  };

  return (
    <div className="view-container swap-view-container">
      <h2>Swap Interface</h2>
      <form onSubmit={handleSubmitSwap} className="swap-form" aria-labelledby="swap-form-heading">
        <h3 id="swap-form-heading" className="sr-only">Create New Swap Form</h3>
        <section className="swap-section" aria-labelledby="your-offer-heading">
          <h4 id="your-offer-heading">Your Offer</h4>
          <p className="chain-indicator">You are on: <strong>{currentChainName || 'N/A'}</strong></p>
          <div className="form-group">
            <label htmlFor="yourToken">Token you send:</label>
            <select id="yourToken" value={yourToken} onChange={(e) => setYourToken(e.target.value)} required>
              {MOCK_TOKENS.map(token => (
                <option key={`${token.symbol}-your`} value={token.symbol}>{token.name} ({token.symbol})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="yourAmount">Amount you send:</label>
            <input
              type="number"
              id="yourAmount"
              value={yourAmount}
              onChange={(e) => setYourAmount(e.target.value)}
              placeholder="e.g., 1.5"
              min="0.000001"
              step="any"
              required
              aria-describedby="yourAmountHelp"
            />
            <small id="yourAmountHelp" className="form-text text-muted">Enter a positive amount.</small>
          </div>
        </section>

        <section className="swap-section" aria-labelledby="counterparty-offer-heading">
          <h4 id="counterparty-offer-heading">Counterparty's Offer</h4>
           <p className="chain-indicator">They are on: <strong>{otherChainName || 'N/A'}</strong></p>
          <div className="form-group">
            <label htmlFor="counterpartyAddress">Counterparty Wallet Address:</label>
            <input
              type="text"
              id="counterpartyAddress"
              value={counterpartyAddress}
              onChange={(e) => setCounterpartyAddress(e.target.value)}
              placeholder="0x..."
              required
              pattern="^0x[a-fA-F0-9]{40}$"
              title="Enter a valid Ethereum wallet address (e.g., 0x...)"
              aria-describedby="counterpartyAddressHelp"
            />
            <small id="counterpartyAddressHelp" className="form-text text-muted">Must be a valid Ethereum address.</small>
          </div>
          <div className="form-group">
            <label htmlFor="counterpartyToken">Token they send:</label>
            <select id="counterpartyToken" value={counterpartyToken} onChange={(e) => setCounterpartyToken(e.target.value)} required>
              {MOCK_TOKENS.map(token => (
                <option key={`${token.symbol}-counterparty`} value={token.symbol}>{token.name} ({token.symbol})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="counterpartyAmount">Amount they send:</label>
            <input
              type="number"
              id="counterpartyAmount"
              value={counterpartyAmount}
              onChange={(e) => setCounterpartyAmount(e.target.value)}
              placeholder="e.g., 100"
              min="0.000001"
              step="any"
              required
              aria-describedby="counterpartyAmountHelp"
            />
            <small id="counterpartyAmountHelp" className="form-text text-muted">Enter a positive amount.</small>
          </div>
        </section>
        
        <div className="form-actions">
            <p className="fee-notice">Platform Fee: 1.5% (Rewards stakers)</p>
            <button type="submit" className="button button-primary button-large">Initiate Swap</button>
        </div>
      </form>
      
      <div className="active-swaps-list">
        <h3>Your Active Swaps</h3>
        <p><em>Swap listing, status tracking, and deposit/finalize actions will appear here once a swap is initiated.</em></p>
      </div>
    </div>
  );
};

const MOCK_ACTIVITY_DATA = [
  {
    id: 'act-1', type: 'Swap', title: 'Swap Finalized', date: new Date(Date.now() - 1 * 60 * 60 * 1000), 
    description: 'Swap of 0.5 ETH (Base) for 750 USDC (Polygon) with 0x987...abc completed.',
    status: 'Completed', txHash: '0x123abc456def7890123abc456def7890123abc456def7890123abc456def7890', chain: 'Base'
  },
  {
    id: 'act-2', type: 'Stake', title: 'Tokens Staked', date: new Date(Date.now() - 5 * 60 * 60 * 1000), 
    description: 'You staked 100 kaETH tokens.',
    status: 'Completed', txHash: '0xdef456abc7890123def456abc7890123def456abc7890123def456abc7890123', chain: 'Polygon'
  },
  {
    id: 'act-3', type: 'Swap', title: 'Swap Initiated', date: new Date(Date.now() - 24 * 60 * 60 * 1000), 
    description: 'Initiated swap of 2 ETH (Polygon) for 3000 DAI (Base) with 0x456...def. Waiting for counterparty.',
    status: 'Pending', txHash: '0x789def012abc3456789def012abc3456789def012abc3456789def012abc3456', chain: 'Polygon'
  },
  {
    id: 'act-4', type: 'Reward', title: 'Rewards Claimed', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), 
    description: 'Claimed 0.05 kaETH in staking rewards.',
    status: 'Completed', txHash: '0xabc123def4567890abc123def4567890abc123def4567890abc123def4567890', chain: 'Base'
  },
  {
    id: 'act-5', type: 'Unstake', title: 'Tokens Unstaked', date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), 
    description: 'You unstaked 50 kaETH tokens.',
    status: 'Completed', txHash: '0x456789abc123def0456789abc123def0456789abc123def0456789abc123def0', chain: 'Polygon'
  },
    {
    id: 'act-6', type: 'Swap', title: 'Swap Failed', date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), 
    description: 'Attempted swap of 0.1 ETH (Base) for 150 USDC (Polygon) failed due to timeout.',
    status: 'Failed', txHash: '0xfailedA1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0C1D2E3F4A5B6C7D8E9F0', chain: 'Base'
  },
];

const ActivityView = () => {
  const [filterType, setFilterType] = useState('All'); 

  const getIconForActivityType = (type) => {
    switch (type) {
      case 'Swap': return '⇄'; 
      case 'Stake': return '💰'; 
      case 'Unstake': return '📤'; 
      case 'Reward': return '⭐'; 
      default: return 'ⓘ'; 
    }
  };

  const formatActivityDate = (date) => {
    return date.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getBlockExplorerLink = (txHash, chainName) => {
    if (!txHash || !chainName) return null;
    const baseUrl = chainName === 'Base' ? 'https://basescan.org/tx/' : 'https://polygonscan.com/tx/';
    return `${baseUrl}${txHash}`;
  };

  const filteredActivities = MOCK_ACTIVITY_DATA.filter(activity => {
    if (filterType === 'All') return true;
    if (filterType === 'Swaps') return activity.type === 'Swap';
    if (filterType === 'Staking') return ['Stake', 'Unstake', 'Reward'].includes(activity.type);
    return true;
  }).sort((a,b) => b.date.getTime() - a.date.getTime()); 

  return (
    <div className="view-container activity-view-container">
      <h2>Activity Feed</h2>
      <p>Track recent swaps, staking actions, and other important events.</p>

      <div className="activity-filters">
        <label htmlFor="activityFilter">Filter by type:</label>
        <select id="activityFilter" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="All">All Activities</option>
          <option value="Swaps">Swaps Only</option>
          <option value="Staking">Staking & Rewards</option>
        </select>
      </div>

      {filteredActivities.length === 0 ? (
        <p className="empty-activity-message">No matching activity found.</p>
      ) : (
        <ul className="activity-list" aria-live="polite">
          {filteredActivities.map(item => (
            <li key={item.id} className="activity-item">
              <span className="activity-item-icon" aria-hidden="true">{getIconForActivityType(item.type)}</span>
              <div className="activity-item-content">
                <div className="activity-item-header">
                  <h4 className="activity-item-title">{item.title}</h4>
                  <span className="activity-item-date">{formatActivityDate(item.date)}</span>
                </div>
                <p className="activity-item-details">{item.description}</p>
                <div className="activity-item-meta">
                  {item.status && (
                    <span className={`status-badge status-${item.status.toLowerCase()}`}>{item.status}</span>
                  )}
                  {item.txHash && item.chain && (
                    <a
                      href={getBlockExplorerLink(item.txHash, item.chain)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tx-link"
                      aria-label={`View transaction ${item.txHash.substring(0,10)}... on ${item.chain} explorer`}
                    >
                      View Tx ({item.txHash.substring(0, 6)}...{item.txHash.substring(item.txHash.length - 4)})
                    </a>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};


function App() {
  const [activeTab, setActiveTab] = useState('swap'); 
  const { address, chainId, isConnected } = useAccount();
  const { data: ensName } = useEnsName({ address, chainId: chainId, query: { enabled: !!address && !!chainId }});
  const { connect, connectors, isLoading: isConnecting, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isLoading: isSwitchingChain, error: switchChainError } = useSwitchChain();

  const walletConnectConnector = connectors.find(c => c.id === 'walletConnect');

  const currentChainName = chainId ? CHAIN_ID_TO_NAME_MAP[chainId] : null;

  const handleConnectWallet = async () => {
    if (IS_PLACEHOLDER_ID) {
      alert('WalletConnect is not configured. Please set your Project ID in the code (index.tsx).');
      return;
    }
    // Use the first available connector (WalletConnect) if not found by id
    const connector = walletConnectConnector || connectors[0];
    if (connector) {
      try {
        await connect({ connector });
      } catch (err) {
        alert('Failed to connect wallet: ' + (err?.message || err));
      }
    } else {
      alert('No WalletConnect connector found. Please check your wagmi/connectors setup.');
    }
  };

  const handleSwitchChain = (targetChainName) => {
    const targetChainId = CHAIN_NAME_TO_ID_MAP[targetChainName];
    if (switchChain && targetChainId && chainId !== targetChainId) {
      switchChain({ chainId: targetChainId });
    }
  };
  
  const WalletConnectWarning = () => (
    <p style={{color: 'red', marginTop: '10px', fontWeight: 'bold', border: '1px solid red', padding: '10px', borderRadius: 'var(--border-radius)'}}>
      Configuration Required: WalletConnect Project ID is set to a placeholder. 
      Please update <code>WALLETCONNECT_PROJECT_ID</code> in <code>index.tsx</code> with your own valid ID from 
      <a href="https://cloud.walletconnect.com" target="_blank" rel="noopener noreferrer" style={{color: 'red', textDecoration: 'underline', marginLeft: '4px'}}>cloud.walletconnect.com</a>.
      The "Connect Wallet" feature will not work correctly until this is done.
    </p>
  );
  
  // const isActualPlaceholderId = WALLETCONNECT_PROJECT_ID === 'YOUR_WALLETCONNECT_PROJECT_ID'; // Removed, use global IS_PLACEHOLDER_ID


  const renderContent = () => {
    if (IS_PLACEHOLDER_ID && !isConnected) { // Use global IS_PLACEHOLDER_ID
       return (
        <div className="connect-wallet-prompt">
          <h2>Welcome to kaETH true mode</h2>
          <WalletConnectWarning />
          <button 
            className="button button-primary"
            disabled={true}
            title="WalletConnect Project ID is not set. Please configure it in the code."
          >
            Connect Wallet (Setup Required)
          </button>
        </div>
      );
    }
    
    if (!isConnected) {
      return (
        <div className="connect-wallet-prompt">
          <h2>Welcome to kaETH true mode</h2>
          <p>Please connect your wallet to access the platform features.</p>
          <button 
            onClick={handleConnectWallet} 
            className="button button-primary"
            disabled={isConnecting || !walletConnectConnector}
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
          {connectError && <p style={{color: 'red', marginTop: '10px'}}>Connection Error: {connectError.message}. Ensure your WalletConnect Project ID is valid.</p>}
        </div>
      );
    }

    return (
      <>
        {switchChainError && <p style={{color: 'red', marginBottom: '10px', textAlign: 'center'}}>Chain Switch Error: {switchChainError.message}</p>}
        {(() => {
          switch (activeTab) {
            case 'swap':
              return <SwapView currentChainName={currentChainName} />;
            case 'stake':
              return <StakeView />;
            case 'activity':
              return <ActivityView />;
            default:
              return <SwapView currentChainName={currentChainName} />;
          }
        })()}
      </>
    );
  };
  
  let formattedDisplayAddress = 'N/A';
  if (isConnected && address) {
    const shortAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    formattedDisplayAddress = ensName ? `${ensName} (${shortAddress})` : shortAddress;
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">kaETH true mode</div>
        <div className="wallet-section">
          {isConnected && address ? (
            <>
              <div className="wallet-info">
                <span>{`Connected: ${formattedDisplayAddress} on `}</span>
                <span className="chain-name">{currentChainName || 'Unsupported Chain'}</span>
              </div>
              <div className="chain-switcher">
                <button
                  onClick={() => handleSwitchChain('Base')}
                  disabled={!switchChain || chainId === CHAIN_BASE_ID || isSwitchingChain}
                  className={`button button-small ${chainId === CHAIN_BASE_ID ? 'active' : ''}`}
                  aria-pressed={chainId === CHAIN_BASE_ID}
                >
                  {isSwitchingChain && chainId !== CHAIN_BASE_ID && currentChainName !== 'Base' ? 'Switching...' : 'Base'}
                </button>
                <button
                  onClick={() => handleSwitchChain('Polygon')}
                  disabled={!switchChain || chainId === CHAIN_POLYGON_ID || isSwitchingChain}
                  className={`button button-small ${chainId === CHAIN_POLYGON_ID ? 'active' : ''}`}
                  aria-pressed={chainId === CHAIN_POLYGON_ID}
                >
                  {isSwitchingChain && chainId !== CHAIN_POLYGON_ID && currentChainName !== 'Polygon' ? 'Switching...' : 'Polygon'}
                </button>
              </div>
              <button onClick={() => disconnect()} className="button button-outline">Disconnect</button>
            </>
          ) : (
            <>
              {IS_PLACEHOLDER_ID && (
                 <p style={{color: 'red', fontSize: '0.9em', textAlign: 'right', width: '100%', margin: 0}}>
                    Action Required: Configure WalletConnect Project ID in index.tsx
                 </p>
              )}
              <button 
                onClick={handleConnectWallet} 
                className="button button-primary"
                disabled={isConnecting || IS_PLACEHOLDER_ID}
                title={IS_PLACEHOLDER_ID ? "WalletConnect Project ID is not set. Please configure it in the code." : "Connect your wallet"}
              >
                {isConnecting ? 'Connecting...' : (IS_PLACEHOLDER_ID ? 'Setup Required' : 'Connect Wallet')}
              </button>
            </>
          )}
        </div>
      </header>
      
      {isConnected && (
        <nav className="app-nav" aria-label="Main navigation">
          <button
            onClick={() => setActiveTab('swap')}
            className={`nav-button ${activeTab === 'swap' ? 'active' : ''}`}
            aria-current={activeTab === 'swap' ? 'page' : undefined}
          >
            Swap
          </button>
          <button
            onClick={() => setActiveTab('stake')}
            className={`nav-button ${activeTab === 'stake' ? 'active' : ''}`}
            aria-current={activeTab === 'stake' ? 'page' : undefined}
          >
            Stake
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`nav-button ${activeTab === 'activity' ? 'active' : ''}`}
            aria-current={activeTab === 'activity' ? 'page' : undefined}
          >
            Activity
          </button>
        </nav>
      )}

      <main className="app-main">
        {renderContent()}
      </main>

      {/* <footer className="app-footer">
        <p>© {new Date().getFullYear()} kaETH true mode. All rights reserved.</p>
      </footer> */}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
