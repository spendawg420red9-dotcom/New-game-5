import React, { useState } from 'react';
import { PlayerProfile } from '../types';
import { CALLING_CARDS } from '../callingCards';
import { Player3DViewer } from './Player3DViewer';

interface Props {
  profile: PlayerProfile;
  onClose: () => void;
  onUpdateProfile: (profile: PlayerProfile) => void;
}

export const PlayerProfileModal: React.FC<Props> = ({ profile, onClose, onUpdateProfile }) => {
  const [clanTag, setClanTag] = useState(profile.clanTag || '');

  const handleClanTagChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.slice(0, 5);
    setClanTag(value);
    onUpdateProfile({ ...profile, clanTag: value });
  };

  const handleEquipCard = (cardId: string) => {
    onUpdateProfile({
      ...profile,
      customization: { ...profile.customization, equippedCallingCard: cardId }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl w-full max-w-4xl text-white">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black uppercase italic tracking-tight">Player Profile: {profile.nickname}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">Close</button>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-1 space-y-4">
            <Player3DViewer customization={profile.customization} />
            <div className="bg-zinc-800 p-4 rounded-xl">
              <label className="block text-xs font-bold text-zinc-400 uppercase">Clan Tag</label>
              <input 
                type="text" 
                value={clanTag} 
                onChange={handleClanTagChange}
                maxLength={5}
                className="w-full bg-zinc-700 p-2 rounded mt-1 font-mono uppercase"
                placeholder="TAG"
              />
            </div>
            <div className="bg-zinc-800 p-4 rounded-xl">
              <h3 className="text-sm font-bold text-zinc-400 uppercase mb-2">Stats</h3>
              <p>Level: {profile.level}</p>
              <p>Total Kills: {profile.totalKills}</p>
              <p>Boss Kills: {profile.bossKills}</p>
              <p>Shop Points: {profile.shopPoints || 0}</p>
            </div>
          </div>
          <div className="col-span-2 space-y-4">
            <div className="bg-zinc-800 p-4 rounded-xl h-64 overflow-y-auto">
              <h3 className="text-sm font-bold text-zinc-400 uppercase mb-2">Calling Cards</h3>
              <div className="space-y-2">
                {CALLING_CARDS.map(card => {
                  const isUnlocked = profile.unlockedCallingCards.includes(card.id);
                  const isEquipped = profile.customization.equippedCallingCard === card.id;
                  return (
                    <button 
                      key={card.id}
                      onClick={() => isUnlocked && handleEquipCard(card.id)}
                      disabled={!isUnlocked}
                      className={`w-full p-2 rounded flex items-center gap-3 ${isEquipped ? 'border-2 border-yellow-500' : 'border border-zinc-700'} ${isUnlocked ? 'bg-zinc-700' : 'bg-zinc-800 opacity-50'}`}
                    >
                      <div className={`w-10 h-6 ${card.style} rounded`}></div>
                      <div className="text-left">
                        <p className="text-sm font-bold">{card.name}</p>
                        <p className="text-xs text-zinc-400">{isUnlocked ? card.description : 'Locked'}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
