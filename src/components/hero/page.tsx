'use client';

import { useEffect, useRef, useState } from 'react';
import { Login } from "../login/page";
import styles from "../../app/page.module.css";
import './style.css';
import { prepareContractCall, getContract } from "thirdweb";
import { useSendTransaction, useActiveAccount } from "thirdweb/react";
import { client } from '@/app/client';
import { ethers } from 'ethers';
import { chainUsed, factoryContractABI, factoryContractADDRESS } from '@/utils/factoryContract/page';
import Swal from 'sweetalert2';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';

const baseURL = process.env.NEXT_PUBLIC_ALCHEMY_BASEURL_ID

const contractFactory = getContract({
  client,
  chain: chainUsed,
  address: factoryContractADDRESS,
});

export default function Hero() {
  const { mutate: sendTransaction, isPending, isError, isSuccess, data } = useSendTransaction();
  const activeAccount = useActiveAccount();
  const [isFormDisabled, setIsFormDisabled] = useState(true); // Default to disabled
  const [contractAddress, setContractAddress] = useState(null);

  const tokenNameRef = useRef<HTMLInputElement>(null);
  const tokenSymbolRef = useRef<HTMLInputElement>(null);
  const tokenSupplyRef = useRef<HTMLInputElement>(null);

  const provider = new ethers.JsonRpcProvider(baseURL);
  const contractEthers = new ethers.Contract(factoryContractADDRESS, factoryContractABI, provider);

  const [tokenData, setTokenData] = useState({
    name: '',
    symbol: '',
    tokenSupply: '',
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleInputChange = (e: { target: { name: string; value: string; }; }) => {
    const { name, value } = e.target;
    setTokenData({
      ...tokenData,
      [name]: value,
    });
  };

  useEffect(() => {
    const audioElement = new Audio('/Energy.mp3');
    audioRef.current = audioElement;

    if (activeAccount) {
      setIsFormDisabled(false); // Enable the form when the wallet is connected

      const tokenNameInput = tokenNameRef.current;
      const tokenSymbolInput = tokenSymbolRef.current;
      const tokenSupplyInput = tokenSupplyRef.current;

      if (!tokenNameInput || !tokenSymbolInput || !tokenSupplyInput) {
        return;
      }

      const handleClick = () => {
        if (audioRef.current) {
          audioRef.current.play().catch(error => {
            console.error("Audio play error:", error);
          });
        }
      };

      tokenNameInput.addEventListener('click', handleClick);
      tokenSymbolInput.addEventListener('click', handleClick);
      tokenSupplyInput.addEventListener('click', handleClick);

      return () => {
        tokenNameInput.removeEventListener('click', handleClick);
        tokenSymbolInput.removeEventListener('click', handleClick);
        tokenSupplyInput.removeEventListener('click', handleClick);
      };
    } else {
      setIsFormDisabled(true); // Disable the form when the wallet is not connected
    }
  }, [activeAccount]);

  useEffect(() => {
    // Generate and store a unique ID for the user session
    if (!localStorage.getItem('userSessionId')) {
      localStorage.setItem('userSessionId', uuidv4());
    }
  }, []);

  const deployToken = async () => {
    if (activeAccount) {
      try {
        setIsFormDisabled(true);

        Swal.fire({
          title: 'Deploying...',
          text: 'Please wait while your token is being deployed.',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          },
          customClass: {
            popup: 'swal2-popup',
            title: 'swal2-title',
            htmlContainer: 'swal2-html-container',
            confirmButton: 'swal2-confirm',
            cancelButton: 'swal2-cancel'
          }
        });

        const tokenSupply_ = parseFloat(tokenData.tokenSupply);
        if (isNaN(tokenSupply_)) {
          throw new Error("Invalid token supply value");
        }

        const tSupply = ethers.parseUnits(tokenData.tokenSupply, 18);
        const userSessionId = localStorage.getItem('userSessionId') as string;

        const transaction = prepareContractCall({
          contract: contractFactory,
          method: "function deployToken(string name, string symbol, uint256 totalSupply) payable",
          params: [tokenData.name, tokenData.symbol, tSupply],
          value: ethers.parseEther("0.03"), // 0.03 ETH
        });

        console.log("Sending transaction:", transaction);

        sendTransaction(transaction, {
          onSuccess: async (receipt) => {
            console.log("Transaction successful, receipt:", receipt);
          },
          onError: (error) => {
            console.error("Transaction error:", error);
            Swal.fire({
              title: 'Error!',
              text: 'Check for any missing field or wrong input',
              icon: 'error',
              confirmButtonText: 'OK',
              customClass: {
                popup: 'swal2-popup',
                title: 'swal2-title',
                htmlContainer: 'swal2-html-container',
                confirmButton: 'swal2-confirm',
                cancelButton: 'swal2-cancel'
              }
            });
            setIsFormDisabled(false);
          },
        });
      } catch (e) {
        console.error("Deployment error:", e);
        Swal.fire({
          title: 'Error!',
          text: 'Check the input data',
          icon: 'error',
          confirmButtonText: 'OK',
          customClass: {
            popup: 'swal2-popup',
            title: 'swal2-title',
            htmlContainer: 'swal2-html-container',
            confirmButton: 'swal2-confirm',
            cancelButton: 'swal2-cancel'
          }
        });
        setIsFormDisabled(false);
      }
    } else {
      console.error('Connect the wallet');
      Swal.fire({
        title: 'Error!',
        text: 'Connect the wallet',
        icon: 'error',
        confirmButtonText: 'OK',
        customClass: {
          popup: 'swal2-popup',
          title: 'swal2-title',
          htmlContainer: 'swal2-html-container',
          confirmButton: 'swal2-confirm',
          cancelButton: 'swal2-cancel'
        }
      });
    }
  };

  useEffect(() => {
    if (contractEthers && activeAccount) {
      console.log("Setting up event listener for TokenDeployed event.");

      contractEthers.on("TokenDeployed", (tokenAddress, name, symbol, totalSupply, userSessionId) => {
        console.log("TokenDeployed event detected");
        console.log("Token Name:", name);
        console.log("Token Symbol:", symbol);
        console.log("Total Supply:", totalSupply.toString());
        console.log("Contract address:", tokenAddress);

        // Check if the userSessionId matches the one in localStorage
        const localSessionId = localStorage.getItem('userSessionId');
        if (tokenData.name == name) {
          setContractAddress(tokenAddress);

          Swal.close();
          Swal.fire({
            title: 'Success!',
            text: 'Your token has been deployed.',
            icon: 'success',
            confirmButtonText: 'OK',
            customClass: {
              popup: 'swal2-popup',
              title: 'swal2-title',
              htmlContainer: 'swal2-html-container',
              confirmButton: 'swal2-confirm',
              cancelButton: 'swal2-cancel'
            }
          });
          setIsFormDisabled(false);
        }
      });

      return () => {
        console.log("Cleaning up event listener for TokenDeployed event.");
        contractEthers.removeAllListeners("TokenDeployed");
      };
    }
  }, [contractEthers, activeAccount, contractAddress]);

  return (
    <main className={styles.main}>
      <div className={styles.about}>
        <h1 className={styles.title}>CannaMint</h1>
        <p className={styles.subtitle}>
          The <img src="/img/base-space.png" alt="Icon" className={styles.icon} width={40} height={30} /> Way to Launch
        </p>
        <p className={styles.textinfo}>Create your own Base ERC-20 contract with no code in ten seconds!</p>
        <Login />
      </div>

      <div className={styles.formContainer}>
        <div className={styles.form}>
          <input
            type="text"
            id="tokenName"
            name="name"
            placeholder="Your token's name"
            maxLength={30}
            required
            className={styles.input}
            ref={tokenNameRef}
            onKeyPress={(event) => {
              if (!/[a-zA-Z0-9 '.]/.test(event.key)) {
                event.preventDefault();
              }
            }}
            onPaste={(event) => {
              event.preventDefault();
            }}
            onChange={handleInputChange}
            disabled={isFormDisabled}
          />
          <input
            type="text"
            id="tokenSymbol"
            name="symbol"
            placeholder="Your token's symbol"
            maxLength={8}
            required
            className={styles.input}
            ref={tokenSymbolRef}
            onKeyPress={(event) => {
              if (!/[a-zA-Z0-9 '.]/.test(event.key)) {
                event.preventDefault();
              }
            }}
            onPaste={(event) => {
              event.preventDefault();
            }}
            onChange={handleInputChange}
            disabled={isFormDisabled}
          />
          <input
            type="text"
            id="tokenSupply"
            name="tokenSupply"
            placeholder="Total token supply"
            maxLength={20}
            required
            className={styles.input}
            ref={tokenSupplyRef}
            onKeyPress={(event) => {
              if (!/[0-9]/.test(event.key)) {
                event.preventDefault();
              }
            }}
            onPaste={(event) => {
              event.preventDefault();
            }}
            onChange={handleInputChange}
            disabled={isFormDisabled}
          />
          <button
            className={`btn rounded-md flex py-4 px-2 ${!activeAccount ? 'cursor-not-allowed opacity-50' : ''}`}
            onClick={deployToken}
            disabled={isFormDisabled}
            style={{ cursor: !activeAccount ? 'not-allowed' : 'pointer' }}
          >
            Deploy Token
          </button>
        </div>
      </div>
      <audio ref={audioRef} src="/Energy.mp3" />
      {contractAddress && (
        <p className={`${styles.textinfo}`}>
          Contract deployed @
          <a href={`https://basescan.org/address/${contractAddress}`} target="_blank" rel="noopener noreferrer">
            {`https://basescan.org/address/${contractAddress}`}
          </a>
        </p>
      )}

      <p className={`${styles.textinfo2}`}>
        Total Deployment Fee: 0.03 Base Eth + 1% supply fee. <br />Read the <Link href="/docs" className={styles.docsLink}>docs</Link> to learn more
      </p>
    </main>
  );
}
