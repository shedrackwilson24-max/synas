import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Area } from 'react-easy-crop';
import { X, Check, RotateCcw, ZoomIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import getCroppedImg from '../lib/imageUtils';

interface ImageUploadModalProps {
  image: string;
  onClose: () => void;
  onCropComplete: (croppedBlob: Blob) => void;
}

export default function ImageUploadModal({ image, onClose, onCropComplete }: ImageUploadModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChange = (crop: { x: number; y: number }) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropCompleteInternal = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    
    setIsProcessing(true);
    try {
      const croppedBlob = await getCroppedImg(image, croppedAreaPixels, rotation);
      if (croppedBlob) {
        onCropComplete(croppedBlob);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
    >
      <div className="bg-[#111] w-full max-w-lg rounded-[2.5rem] border border-gray-800 overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 flex items-center justify-between border-b border-gray-800 bg-black/40">
          <div>
            <h3 className="text-xl font-black italic uppercase tracking-tighter">Calibrate Avatar</h3>
            <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest mt-0.5">Focus your neural profile</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="relative h-[350px] bg-black/60">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={onCropChange}
            onCropComplete={onCropCompleteInternal}
            onZoomChange={onZoomChange}
          />
        </div>

        <div className="p-8 space-y-6 bg-black/20">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <ZoomIn size={16} className="text-gray-500" />
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-accent h-1 bg-gray-800 rounded-full appearance-none cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-4">
              <RotateCcw size={16} className="text-gray-500" />
              <input
                type="range"
                value={rotation}
                min={0}
                max={360}
                step={1}
                aria-labelledby="Rotation"
                onChange={(e) => setRotation(Number(e.target.value))}
                className="flex-1 accent-accent h-1 bg-gray-800 rounded-full appearance-none cursor-pointer"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              disabled={isProcessing}
              onClick={onClose}
              className="flex-1 py-4 bg-gray-900 text-gray-400 rounded-2xl font-black italic uppercase tracking-widest text-xs hover:bg-gray-800 transition-all border border-gray-800/50"
            >
              Abort
            </button>
            <button
              disabled={isProcessing}
              onClick={handleSave}
              className="flex-1 py-4 bg-accent text-black rounded-2xl font-black italic uppercase tracking-widest text-xs hover:scale-[1.02] transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <><Check size={16} strokeWidth={3} /> Upload</>
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
