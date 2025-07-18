"use client";

import React, { Suspense, useState, useEffect, useRef } from "react";
import Head from 'next/head';
import { useSearchParams } from 'next/navigation';
import { HeroHeader } from '@/components/header';
import { Activity, Info, Plus } from 'lucide-react';
import FooterSection from '@/components/footer';
import useIOChat from '@/hooks/useIo';
import { AnimatePresence, motion } from 'framer-motion';
import { INFT, ChatMessage } from '@/app/utils/types';

const StageProgressIndicator = ({ currentStage }: { currentStage: string }) => {
  const stages = ["Initiation", "Learning", "Synchronizing", "Evolving"];
  const currentIndex = stages.indexOf(currentStage);
  
  return (
    <div className="w-full pt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-400">Stage:</span>
        <span className="text-sm text-blue-300 font-medium">{currentStage}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2.5">
        <div 
          className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2.5 rounded-full" 
          style={{ width: `${((currentIndex + 1) / stages.length) * 100}%` }}
        ></div>
      </div>
      <div className="flex justify-between mt-1">
        {stages.map((stage, index) => (
          <div 
            key={index} 
            className={`flex flex-col items-center ${index <= currentIndex ? 'text-blue-300' : 'text-gray-500'}`}
          >
            <div className={`w-3 h-3 rounded-full ${index <= currentIndex ? 'bg-blue-400' : 'bg-gray-600'}`}></div>
            <span className="text-xs mt-1 hidden md:inline">{stage}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const InteractionContent = () => {
  const searchParams = useSearchParams();
  const [nft, setNft] = useState<INFT | null>(null);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [displayedResponse, setDisplayedResponse] = useState('');
  const [fullResponse, setFullResponse] = useState('');
  const { response, error, handleChat, isLoading } = useIOChat();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [quotes, setQuotes] = useState(10);
  const [interactionCount, setInteractionCount] = useState(0);

  const getCurrentStage = (interactionCount: number) => {
    if (interactionCount < 5) return "Initiation";
    if (interactionCount < 15) return "Learning";
    if (interactionCount < 30) return "Synchronizing";
    return "Evolving";
  };

  useEffect(() => {
    const nftString = searchParams.get('nft');
    if (nftString) {
      try {
        const parsedNft = JSON.parse(decodeURIComponent(nftString));
        setNft(parsedNft);
        setInteractionCount(parsedNft.interaction_count || 0);
      } catch (error) {
        console.error('Failed to parse NFT data:', error);
      }
    }
  }, [searchParams]);

  const getInstructions = () => {
    if (!nft) return '';

    const baseInstruction = `You are an Intelligent NFT (iNFT) with the description: "${nft.description}". Respond to the user's query based on this description, but do not include the description or this instruction in your response. Focus solely on the user's input.`;

    switch (nft.atoma_model_id?.toLowerCase()) {
      case 'creative':
        return `${baseInstruction} Use a creative tone, emphasizing imaginative ideas, storytelling, or artistic concepts related to the iNFT's theme.`;
      case 'analytical':
        return `${baseInstruction} Use an analytical tone, providing logical, data-driven insights or evaluations related to the iNFT's theme.`;
      case 'companion':
        return `${baseInstruction} Use an empathetic, friendly tone, acting as a supportive companion related to the iNFT's theme.`;
      default:
        return `${baseInstruction} Use a neutral, balanced tone, engaging naturally with the user based on the iNFT's theme.`;
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!message.trim() || isLoading || !nft) return;

    if (quotes <= 0) {
      alert("You have no quotes left. Please purchase more quotes to continue interacting.");
      return;
    }

    setQuotes(prev => prev - 1);
    setInteractionCount(prev => prev + 1);

    const newMessage: ChatMessage = { role: 'user', content: message, timestamp: Date.now() };
    setChatHistory(prev => [...prev, newMessage]);

    const instructions = getInstructions();
    console.log('Submitting chat:', { message, instructions, chatHistory });
    await handleChat(message, instructions, chatHistory);
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleAddQuote = () => {
    alert("Purchase more quotes to continue interacting with your INFT.");
    setQuotes(prev => prev + 10);
  };

  useEffect(() => {
    if (response && response !== fullResponse) {
      setFullResponse(response);
      setIsTyping(true);
      setDisplayedResponse('');
      setChatHistory(prev => [...prev, { role: 'assistant', content: response, timestamp: Date.now() }]);
    }
  }, [response]);

  useEffect(() => {
    if (isTyping && fullResponse) {
      let i = 0;
      const typingSpeed = 15;
      const typingInterval = setInterval(() => {
        if (i < fullResponse.length) {
          setDisplayedResponse(fullResponse.substring(0, i + 1));
          i++;
        } else {
          clearInterval(typingInterval);
          setIsTyping(false);
        }
      }, typingSpeed);
      return () => clearInterval(typingInterval);
    }
  }, [isTyping, fullResponse]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, displayedResponse]);

  if (!nft) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-black to-gray-900 flex flex-col items-center justify-center">
        <Head>
          <title>INFTS | Interaction</title>
          <meta name="description" content="Interact with your selected NFT" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <HeroHeader />
        <div className="text-center text-gray-500 py-12">
          <p>No NFT selected. Please go back and select an NFT.</p>
        </div>
        <FooterSection />
      </div>
    );
  }

  const currentStage = getCurrentStage(interactionCount);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-black to-gray-900 flex flex-col">
      <Head>
        <title>INFTS | Interaction</title>
        <meta name="description" content="Interact with your selected NFT" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <HeroHeader />
      <div className="max-w-7xl mx-auto px-6 pt-24 pb-16 flex-1 w-full">
        <div className="flex flex-col md:flex-row md:items-center gap-8 mb-12">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-8 w-full">
            <div className="w-48 h-48 rounded-lg bg-gradient-to-br from-gray-800/30 to-gray-800/10 border-2 border-gray-700/40 flex items-center justify-center overflow-hidden shadow-xl relative">
              <div className="absolute inset-0 border-4 border-dashed border-gray-600/40 rounded-lg animate-pulse"></div>
              <img
                src={nft.image_url ? nft.image_url : '/placeholder-nft.png'}
                alt={nft.name || 'NFT'}
                className="w-44 h-44 object-cover rounded-lg"
              />
            </div>
            <div className="flex-1 text-left space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-gray-300">
                  {nft.name || 'Unnamed NFT'}
                </h1>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleAddQuote}
                    className="flex items-center justify-center bg-gray-800/70 hover:bg-gray-700/70 text-gray-300 px-4 py-2.5 rounded-lg transition-all duration-200"
                  >
                    <span>Add Quote</span>
                  </button>
                  <button 
                    onClick={() => alert("Adding a quote will increase your INFT's interaction count and contribute to its evolution. Each quote costs 0.1 SUI.")}
                    className="flex items-center justify-center bg-gray-800/70 hover:bg-gray-700/70 text-gray-300 p-2 rounded-full transition-all duration-200"
                  >
                    <Info className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <p className="text-base md:text-lg text-gray-400 leading-relaxed">
                {nft.description || 'No description available'}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-400">Owner:</span>
                <span className="text-sm text-gray-200 font-mono">
                  {nft.content?.fields?.owner
                    ? `${nft.content.fields.owner.slice(0, 6)}...${nft.content.fields.owner.slice(-4)}`
                    : 'N/A'}
                </span>
              </div>
              <StageProgressIndicator currentStage={currentStage} />
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-200">
                    {interactionCount} interactions
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-200">
                    {quotes} Quotes
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full max-w-2xl mx-auto bg-gray-900/50 rounded-2xl shadow-2xl overflow-hidden border border-gray-800/50">
          <div
            ref={chatContainerRef}
            className="h-96 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
          >
            {chatHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                <div className="w-20 h-20 opacity-20 mb-4">
                  <img src="/logo.png" alt="INFTS Logo" className="w-3/4 h-3/4 object-contain" />
                </div>
                <p>Start a conversation with your INFT</p>
              </div>
            ) : (
              chatHistory.map((chat, index) => (
                <div
                  key={index}
                  className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`max-w-[80%] rounded-2xl p-4 ${
                      chat.role === 'user'
                        ? 'bg-[#ABEDE4]/30 text-white ml-auto border border-[#ABEDE4]/30'
                        : 'bg-gray-800/80 text-gray-200 border border-gray-700/50'
                    }`}
                  >
                    <p className="text-sm md:text-base">{chat.content}</p>
                  </motion.div>
                </div>
              ))
            )}
            {isTyping && (
              <div className="flex justify-start">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-[80%] rounded-2xl p-4 bg-gray-800/80 text-gray-200 border border-gray-700/50"
                >
                  <p className="text-sm md:text-base">{displayedResponse}</p>
                  <span className="inline-block ml-1 animate-pulse">▋</span>
                </motion.div>
              </div>
            )}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-red-900/30 border border-red-800/50 p-4 rounded-xl shadow-lg"
                >
                  <p className="text-red-300 text-sm">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <form onSubmit={handleSubmit} className="border-t border-gray-800/50 p-4">
            <div className="flex items-center bg-gray-800/80 rounded-xl overflow-hidden shadow-inner">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Interact with your INFT..."
                className="flex-1 bg-transparent border-none text-gray-300 p-4 focus:outline-none placeholder-gray-500"
                disabled={isLoading}
              />
              <motion.button
                whileTap={{ scale: 0.95 }}
                whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.5)' }}
                type="submit"
                disabled={isLoading || !message.trim() || quotes <= 0}
                className={`px-5 py-3 rounded-lg mr-2 transition-all ${
                  isLoading || !message.trim() || quotes <= 0
                    ? 'text-gray-500 cursor-not-allowed'
                    : 'text-white hover:bg-blue-900/30'
                }`}
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                  </svg>
                )}
              </motion.button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default function InteractionPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InteractionContent />
    </Suspense>
  );
}