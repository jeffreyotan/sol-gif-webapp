import React, { useEffect, useState } from 'react';
import twitterLogo from './assets/twitter-logo.svg';
import './App.css';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';

import idl from './idl.json';
import kp from './keypair.json';

// Constants
const TWITTER_HANDLE = '_buildspace';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

// Not used after implementing full interactive app
// eslint-disable-next-line
const TEST_GIFS = [
	'https://media.giphy.com/media/8oP12pJCHcwdkPL4dV/giphy.gif',
	'https://media.giphy.com/media/Y4K9JjSigTV1FkgiNE/giphy.gif',
	'https://media.giphy.com/media/H55ruY9f3EevZulgUy/giphy-downsized-large.gif',
	'https://media.giphy.com/media/MbaLodIAdd7R98sxov/giphy-downsized-large.gif'
];

const { SystemProgram, Keypair } = web3;

const arr = Object.values(kp._keypair.secretKey);
const secret = new Uint8Array(arr);
const baseAccount = Keypair.fromSecretKey(secret);

const programID = new PublicKey(idl.metadata.address);

const network = clusterApiUrl('devnet');

const opts = {
  preflightCommitment: "processed"
};

const App = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [gifList, setGifList] = useState([]);

  /*
   * This function holds the logic for deciding if
   * a Phantom Wallet is connected or not
   */
  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if (solana) {
        if (solana.isPhantom) {
          console.log("Phantom wallet found!");
          console.log("solana is ", solana);
          const response = await solana.connect({ onlyIfTrusted: true });
          if (response) {
            console.log("[Trusted] Connected with public key: ", response.publicKey.toString());

            setWalletAddress(response.publicKey.toString());
          } else {
            console.error("Could not connect to Phantom wallet!");
          }
        } else {
          alert("Solana object not found! Get a Phantom wallet!");
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  /*
   * Let's define this method so our code doesn't break
   * 
   */
  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      const response = await solana.connect();
      console.log("[Untrusted] Connected with Public Key: ", response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  const sendGif = async () => {
    if (inputValue.length === 0) {
      console.log("No gif link given!");
      return;
    }
    setInputValue('');
    console.log("Gif link: ", inputValue);
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.addGif(inputValue, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      console.log("GIF successfully sent to program: ", inputValue);

      await getGifList();
    } catch (error) {
      console.log("Error sending GIF: ", error);
    }
  };

  const onInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value);
  };

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(connection, window.solana, opts.preflightCommitment);
    return provider;
  };

  const getGifList = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(baseAccount.publicKey);

      console.log("Got the account: ", account);
      setGifList(account.gifList);
    } catch (error) {
      console.error("Error in getGifList: ", error);
      setGifList(null);
    }
  };

  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log("ping");
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount]
      });
      console.log("Created a new BaseAccount with address: ", baseAccount.publicKey.toString());
      await getGifList();
    } catch (error) {
      console.error("Error creating BaseAccount: ", error);
    }
  };

  /*
   * Render this UI when the user hasn't connected their
   * wallet to our app yet
   */
  const renderNotConnectedContainer = () => (
    <button 
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Connect to Wallet
    </button>
  );

  const renderConnectedContainer = () => {
    if (gifList === null) {
      return (
        <div className="connected-container">
          <button className="cta-button submit-gif-button" onClick={createGifAccount}>
          Do one-time initialization for GIF Program account
          </button>
        </div>
      )
    } else {
      return (
        <div className="connected-container">
          <form onSubmit={(event) => {
            event.preventDefault();
            sendGif();
          }}>
            <input
              type="text"
              placeholder="Enter gif link!"
              value={inputValue}
              onChange={onInputChange}
            />
            <button type="submit" className="cta-button submit-gif-button">Submit</button>
          </form>
          <div className="gif-grid">
            {gifList.map((item, index) => (
              <div className="gif-item" key={index}>
                <img src={item.gifLink} alt={item.gifLink} />
              </div>
            ))}
          </div>
        </div>
      )
    }
  };

  /*
   * When our component first mounts, let's check to see if we
   * have a connected Phantom wallet
   */
  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  useEffect(() => {
    if (walletAddress) {
      console.log("Fetching GIF list..");

      // call Solana program here
      getGifList();
    }
  }, [walletAddress]);
  
  return (
    <div className="App">
      <div className={walletAddress ? "authed-container" : "container"}>
        <div className="header-container">
          <p className="header">🖼 Coral Reef GIF Portal</p>
          <p className="sub-text">
            View your Coral Reef GIF collection in the metaverse ✨
          </p>
          {!walletAddress && renderNotConnectedContainer()}
          {walletAddress && renderConnectedContainer()}
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built on @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
