import React from 'react';
import { Player3DViewer } from './Player3DViewer';

interface Props {
  item: any;
  shopTab: string;
  customization: any;
  onClose: () => void;
}

export const ShopItemPreviewModal: React.FC<Props> = ({ item, shopTab, customization, onClose }) => {
  // Create a modified customization object for preview
  const previewCustomization = { ...customization };
  if (shopTab === 'clothes') previewCustomization.clothesStyle = item.id;
  if (shopTab === 'hats') previewCustomization.hat = item.id;
  if (shopTab === 'glasses') previewCustomization.glasses = item.id;
  if (shopTab === 'masks') previewCustomization.mask = item.id;
  if (shopTab === 'helmets') previewCustomization.helmet = item.id;
  if (shopTab === 'chest') previewCustomization.chest = item.id;
  if (shopTab === 'boots') previewCustomization.boots = item.id;
  if (shopTab === 'gloves') previewCustomization.gloves = item.id;
  if (shopTab === 'finisherMoves') previewCustomization.finisherMove = item.id;
  if (shopTab === 'danceMoves') previewCustomization.danceMove = item.id;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl w-full max-w-lg text-white">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black uppercase italic tracking-tight">Preview: {item.name}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">Close</button>
        </div>
        <Player3DViewer customization={previewCustomization} />
      </div>
    </div>
  );
};
